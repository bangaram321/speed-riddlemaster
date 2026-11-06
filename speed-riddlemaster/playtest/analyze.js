#!/usr/bin/env node
/*
 * Speed Riddlemaster — playtest analysis
 *
 *   node playtest/analyze.js export1.json [export2.json ...]
 *
 * Each file is the text players copy from the end-of-game "Copy all playtest data"
 * button (a JSON array of game records). Games are de-duplicated by id, so pasting
 * the same player's export twice is harmless.
 *
 * It reports: win rate, ratings, per-riddle difficulty, guesses that were rejected
 * but look like they deserve to be accepted, and PRD §9 success-metric checks.
 */
const fs = require('fs'), path = require('path');
const Matcher = require('../js/matcher.js');
const RIDDLES = require('../js/riddles.js');
const byId = Object.fromEntries(RIDDLES.map(r => [r.id, r]));

const files = process.argv.slice(2);
if (!files.length) { console.log('Usage: node playtest/analyze.js export1.json [export2.json ...]'); process.exit(1); }

const games = new Map();
files.forEach(f => {
  let raw = fs.readFileSync(f, 'utf8').replace(/^﻿/, '').trim();
  let data;
  try { data = JSON.parse(raw); } catch (e) { console.error('Could not parse ' + f + ': ' + e.message); process.exit(1); }
  (Array.isArray(data) ? data : [data]).forEach(g => { if (g && g.id && Array.isArray(g.riddles)) games.set(g.id, g); });
});
const G = [...games.values()];
if (!G.length) { console.log('No games found.'); process.exit(1); }

if (G.some(g => String(g.id).startsWith('sim'))) console.log('\n*** WARNING: this data contains SIMULATED bot games, not human players. Do not use it to judge the game. ***');
const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : 'n/a';
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const f1 = n => Number.isFinite(n) ? n.toFixed(1) : 'n/a';
const pad = (s, n) => String(s).padEnd(n);
const line = '─'.repeat(72);

// ---------------------------------------------------------------- overview
const wins = G.filter(g => g.won).length;
console.log(`\nSPEED RIDDLEMASTER — PLAYTEST REPORT\n${line}`);
console.log(`Games: ${G.length}   Won: ${wins} (${pct(wins, G.length)})   Avg score: ${f1(avg(G.map(g => g.score)))}   Avg riddles solved: ${f1(avg(G.map(g => g.solved)))}/10`);
const ranks = {}; G.forEach(g => ranks[g.rank] = (ranks[g.rank] || 0) + 1);
console.log('Ranks: ' + Object.entries(ranks).map(([k, v]) => `${k} ×${v}`).join(' · '));
const touch = G.filter(g => g.device && g.device.touch).length;
console.log(`Devices: ${touch} touch / ${G.length - touch} desktop   Sound off in ${G.filter(g => g.device && g.device.sound === false).length} games, music off in ${G.filter(g => g.device && g.device.music === false).length}`);

// ---------------------------------------------------------------- ratings
const Q = { fun: 'That was fun', funny: 'Made me laugh / smile', fair: 'Difficulty felt fair', time: '20 s felt right', look: 'Looks & sounds' };
console.log(`\nRATINGS (1-5)\n${line}`);
const rated = G.filter(g => g.ratings && Object.keys(g.ratings).length);
const ratingStats = {};
Object.keys(Q).forEach(k => {
  const v = rated.map(g => g.ratings[k]).filter(Number.isFinite);
  ratingStats[k] = { n: v.length, mean: avg(v), good: v.filter(x => x >= 4).length };
  console.log(`${pad(Q[k], 26)} mean ${f1(ratingStats[k].mean)}   4-5: ${pct(ratingStats[k].good, v.length)}   (n=${v.length})`);
});

// ---------------------------------------------------------------- riddles
const per = {};
G.forEach(g => g.riddles.forEach(r => {
  const p = per[r.id] || (per[r.id] = { shown: 0, ok: 0, time: 0, bad: 0, secOk: [], multi: 0, fuzzy: 0, wrongGuesses: {} });
  p.shown++; p[r.out]++;
  if (r.out === 'ok') p.secOk.push(r.sec);
  if (r.fuzzy) p.fuzzy++;
  (r.guesses || []).forEach(x => {
    if (x.s === 'multiword') p.multi++;
    if (x.s === 'wrong') p.wrongGuesses[x.t.toLowerCase()] = (p.wrongGuesses[x.t.toLowerCase()] || 0) + 1;
  });
}));
console.log(`\nPER-RIDDLE (hardest first)\n${line}`);
console.log(pad('riddle', 12) + pad('lvl', 5) + pad('shown', 7) + pad('solved', 8) + pad('timeout', 9) + pad('avg s', 7) + 'flags');
const flags = [];
Object.entries(per).sort((a, b) => (a[1].ok / a[1].shown) - (b[1].ok / b[1].shown)).forEach(([id, p]) => {
  const r = byId[id]; const rate = p.ok / p.shown, as = avg(p.secOk), fl = [];
  if (p.shown >= 3 && rate < 0.3) fl.push('TOO HARD?');
  if (p.shown >= 5 && rate > 0.95) fl.push('too easy?');
  if (as > 14) fl.push('slow');
  if (p.shown >= 3 && p.time / p.shown > 0.4) fl.push('timeouts');
  if (p.multi >= 2) fl.push('multiword nudges ×' + p.multi);
  if (fl.length) flags.push(`${id}: ${fl.join(', ')}`);
  console.log(pad(id, 12) + pad(r ? r.d : '?', 5) + pad(p.shown, 7) + pad(pct(p.ok, p.shown), 8) + pad(p.time, 9) + pad(f1(as), 7) + fl.join(', '));
});

// ---------------------------------------------------------------- rejected guesses
console.log(`\nGUESSES THAT WERE REJECTED (review for accepted[] additions)\n${line}`);
let any = false;
Object.entries(per).forEach(([id, p]) => {
  const r = byId[id]; if (!r) return;
  Object.entries(p.wrongGuesses).sort((a, b) => b[1] - a[1]).forEach(([guess, n]) => {
    const w = guess.replace(/[^a-z]/g, '');
    if (!w) return;
    if (Matcher.check(r, guess).status === 'correct') { console.log(`  ${id}: "${guess}" ×${n}  → would be ACCEPTED by the current matcher (bank was updated since)`); any = true; return; }
    const d = Matcher.distance(w, r.a), near = d <= Math.max(2, Math.ceil(r.a.length / 3));
    if (n >= 2 || near) { console.log(`  ${id} (answer "${r.a}"): "${guess}" ×${n}${near ? '  ← close (edit distance ' + d + ')' : ''}${n >= 2 ? '  ← typed by several players: valid synonym?' : ''}`); any = true; }
  });
});
if (!any) console.log('  none worth reviewing');
const fuzzyTotal = Object.values(per).reduce((s, p) => s + p.fuzzy, 0), solvedTotal = Object.values(per).reduce((s, p) => s + p.ok, 0);
console.log(`\nTypos forgiven: ${fuzzyTotal} of ${solvedTotal} correct answers (${pct(fuzzyTotal, solvedTotal)})`);

// ---------------------------------------------------------------- notes
const notes = G.filter(g => g.notes).map(g => '  • ' + g.notes.replace(/\s+/g, ' '));
console.log(`\nFREE-TEXT NOTES (${notes.length})\n${line}`);
console.log(notes.length ? notes.join('\n') : '  none');

// ---------------------------------------------------------------- PRD §9 checks
console.log(`\nPRD §9 SUCCESS CHECKS (small-sample playtest; treat as a guide)\n${line}`);
const wr = wins / G.length;
const checks = [
  ['Win rate 25-40%', wr >= 0.25 && wr <= 0.40, `${pct(wins, G.length)}`],
  ['"Made me laugh" rated 4-5 by >= 80%', ratingStats.funny.n && ratingStats.funny.good / ratingStats.funny.n >= 0.8, `${pct(ratingStats.funny.good, ratingStats.funny.n)}`],
  ['"Fun" mean >= 4.0', ratingStats.fun.mean >= 4, f1(ratingStats.fun.mean)],
  ['"Fair difficulty" mean >= 3.5', ratingStats.fair.mean >= 3.5, f1(ratingStats.fair.mean)],
  ['"20 s felt right" mean >= 3.5', ratingStats.time.mean >= 3.5, f1(ratingStats.time.mean)],
  ['Wrong-answer complaints < 2% (typed answers rejected that are near-correct)', null, 'review the rejected-guess list above by hand']
];
checks.forEach(([name, ok, v]) => console.log(`${ok === null ? '  ?' : ok ? '  ✔' : '  ✘'} ${pad(name, 70)} ${v}`));
if (flags.length) console.log(`\nFLAGGED RIDDLES\n${line}\n  ` + flags.join('\n  '));
console.log('');
