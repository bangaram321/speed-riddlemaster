// Run with:  node tests/matcher.test.js
const assert = require('assert');
const M = require('../js/matcher.js');
const R = require('../js/riddles.js');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('FAIL:', name, '\n   ', e.message); }
}
const byId = id => R.find(r => r.id === id);
const status = (id, s) => M.check(byId(id), s).status;
const ok = (id, s) => t(`${id} accepts "${s}"`, () => assert.strictEqual(status(id, s), 'correct'));
const no = (id, s) => t(`${id} rejects "${s}"`, () => assert.notStrictEqual(status(id, s), 'correct'));

// ---------- data integrity ----------
t('riddle bank has >= 50 riddles', () => assert.ok(R.length >= 50, 'only ' + R.length));
t('ids unique', () => assert.strictEqual(new Set(R.map(r => r.id)).size, R.length));
t('tier counts allow 3/4/3 per game', () => {
  [1, 2, 3].forEach(d => assert.ok(R.filter(r => r.d === d).length >= 4, 'tier ' + d));
});
R.forEach(r => {
  t(`${r.id}: required fields`, () => {
    assert.ok(r.t && r.a && r.q && [1, 2, 3].includes(r.d));
    assert.ok(/^[a-z]+$/.test(r.a), 'answer must be a single lowercase word');
    (r.acc || []).forEach(a => assert.ok(/^[a-z]+$/.test(a), 'bad accepted: ' + a));
  });
  t(`${r.id}: canonical answer + accepted answers match`, () => {
    assert.strictEqual(M.check(r, r.a).status, 'correct');
    (r.acc || []).forEach(a => assert.strictEqual(M.check(r, a).status, 'correct', a));
  });
  t(`${r.id}: reject list never contradicts accepted`, () => {
    const acc = [r.a].concat(r.acc || []);
    (r.rej || []).forEach(x => {
      if (acc.includes(x)) assert.fail('"' + x + '" is both accepted and rejected');
    });
  });
  t(`${r.id}: its own answer is typed-in-caps / padded / with filler`, () => {
    assert.strictEqual(M.check(r, '  ' + r.a.toUpperCase() + '!! ').status, 'correct');
    assert.strictEqual(M.check(r, "it's a " + r.a).status, 'correct');
    assert.strictEqual(M.check(r, 'the ' + r.a + '?').status, 'correct');
  });
});

// ---------- misspellings that SHOULD be forgiven ----------
ok('towel', 'towl');        // deletion
ok('towel', 'towell');      // insertion
ok('towel', 'towal');       // substitution
ok('towel', 'tooowel');     // stretched letters
ok('towel', 'towle');       // transposition
ok('towel', 'Towel!');
ok('umbrella', 'umbrela');
ok('umbrella', 'umbrellla');
ok('umbrella', 'umbrlla');  // 2 typos at 8 letters
ok('artichoke', 'artichoak');
ok('artichoke', 'artichoke');
ok('silence', 'silance');
ok('footsteps', 'footstepz');
ok('footsteps', 'fotsteps');
ok('coffin', 'cofin');
ok('lobster', 'lobstor');
ok('reflection', 'reflecton');
ok('pencil', 'pensil');
ok('mushroom', 'mushrom');
ok('teapot', 'tea pot');    // joined words
ok('teapot', 'tea-pot');
ok('cards', 'deck of cards');
ok('cards', 'card');        // singular
ok('tongue', 'tounge');     // very common misspelling
ok('telephone', 'telefone'.replace('f', 'ph')); // sanity: exact "telephone"
ok('river', 'rivver');
ok('window', 'windwo');
ok('shadow', 'shadows');
ok('sponge', 'spong');

// ---------- guesses that must NOT be forgiven ----------
no('cold', 'gold');
no('cold', 'cord');
no('cold', 'bold');
no('tree', 'three');
no('tree', 'free');
no('hole', 'whole');
no('rain', 'brain');
no('rain', 'train');
no('bank', 'tank');
no('bank', 'band');
no('mind', 'wind');
no('mind', 'kind');
no('comb', 'bomb');
no('comb', 'tomb');
no('book', 'boot');
no('silence', 'silent');
no('silence', 'science');
no('future', 'feature');
no('short', 'shorter');
no('paint', 'point');
no('paint', 'print');
no('window', 'widow');
no('bottle', 'battle');
no('river', 'rider');
no('towel', 'bowel');
no('ton', 'tin');           // 3-letter answers are exact
no('ton', 'tan');
no('map', 'mop');
no('egg', 'ego');
no('key', 'kay');
no('towel', 'napkin');
no('towel', 'dog');

// ---------- non-answers ----------
t('empty input', () => assert.strictEqual(M.check(byId('towel'), '   ').status, 'empty'));
t('only filler', () => assert.strictEqual(M.check(byId('towel'), 'the a').status, 'empty'));
t('several wrong words -> multiword nudge', () =>
  assert.strictEqual(M.check(byId('towel'), 'a big green dog').status, 'multiword'));
t('multi-word containing the answer is accepted', () =>
  assert.strictEqual(M.check(byId('towel'), 'i think it is a towel').status, 'correct'));
t('accent stripping', () => assert.strictEqual(M.check(byId('cold'), 'cöld').status, 'correct'));
t('null input', () => assert.strictEqual(M.check(byId('towel'), null).status, 'empty'));

// ---------- fuzzy flag ----------
t('exact answer is not flagged fuzzy', () => assert.strictEqual(M.check(byId('towel'), 'towel').fuzzy, false));
t('typo answer is flagged fuzzy', () => assert.strictEqual(M.check(byId('towel'), 'towl').fuzzy, true));

// ---------- cross-riddle sanity: one riddle's answer is not auto-correct for another ----------
const clashes = [];
R.forEach(a => R.forEach(b => {
  if (a.id !== b.id && M.check(a, b.a).status === 'correct') clashes.push(`${b.a} is accepted for ${a.id}`);
}));
t('no accidental cross-riddle answer matches (known overlaps: future<->tomorrow)', () => {
  const allowed = new Set(['tomorrow is accepted for future', 'future is accepted for tomorrow']);
  const bad = clashes.filter(c => !allowed.has(c));
  assert.deepStrictEqual(bad, []);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
