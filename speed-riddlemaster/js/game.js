/*
 * Speed Riddlemaster — game flow (title → briefing → riddles → feedback →
 * resurrection → result). Vanilla JS, no build step.
 */
(function () {
  'use strict';

  // ---------- config (PRD §3) ----------
  var CFG = {
    riddles: 10,
    seconds: 20,
    lives: 3,
    mix: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3],   // 3 easy, 4 medium, 3 hard — easy → hard
    startDelay: 650,                        // ms: timer starts once the card has slid in
    urgent: 5,                              // last N seconds get the red/pulse treatment
    base: 100, timeBonus: 100, streakStep: 10, streakCap: 50,
    nextLock: 450                           // ms: ignore Next clicks right after feedback appears
  };
  var RING = 2 * Math.PI * 44;

  // ---------- tiny helpers ----------
  var $ = function (id) { return document.getElementById(id); };
  var els = {};
  [
    'hud', 'lives', 'progress', 'score', 'sound-btn', 'sound-ico', 'music-btn', 'music-ico', 'live',
    'screen-title', 'screen-brief', 'screen-riddle', 'screen-resurrect', 'screen-lose', 'screen-win',
    'btn-open', 'btn-begin', 'btn-submit', 'btn-next', 'btn-resume', 'btn-retry', 'btn-again', 'btn-share-lose', 'btn-share-win',
    'best-line', 'case-no', 'case-card', 'clock', 'clock-ring', 'clock-num', 'riddle-text',
    'answer-form', 'answer', 'nudge', 'feedback', 'fb-stamp', 'fb-line', 'fb-answer', 'fb-quip', 'fb-points',
    'res-line', 'res-lives', 'lose-line', 'lose-summary', 'win-line', 'win-summary', 'copied-lose', 'copied-win'
  ].forEach(function (id) { els[id] = $(id); });

  var PLAYTEST = /[?&]playtest\b/.test(location.search);   // logging + feedback panel for human playtests
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function store(key, val) {
    try {
      if (val === undefined) { var v = localStorage.getItem(key); return v === null ? null : JSON.parse(v); }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  var lastPick = {};
  function pick(poolName) {
    var pool = COPY[poolName], i, tries = 0;
    do { i = Math.floor(Math.random() * pool.length); tries++; } while (pool.length > 1 && i === lastPick[poolName] && tries < 8);
    lastPick[poolName] = i;
    return pool[i];
  }
  // render a copy entry (string or {skill,text}) into an element, without innerHTML
  function setLine(el, entry, vars) {
    el.textContent = '';
    var text = typeof entry === 'string' ? entry : entry.text;
    if (vars) Object.keys(vars).forEach(function (k) { text = text.replace('{' + k + '}', vars[k]); });
    if (typeof entry !== 'string' && entry.skill) {
      var s = document.createElement('span');
      s.className = 'skill s-' + entry.skill.toLowerCase().replace(/\s+/g, '-');
      s.textContent = entry.skill;
      el.appendChild(s);
      el.appendChild(document.createTextNode(' '));
    }
    el.appendChild(document.createTextNode(text));
  }
  function announce(msg) { els.live.textContent = ''; setTimeout(function () { els.live.textContent = msg; }, 30); }

  // ---------- sound (WebAudio, synthesised — no assets) ----------
  var Sound = (function () {
    var ctx = null, on = store('sr_sound'); if (on === null) on = true;
    function ac() {
      if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, at, dur, type, vol, slideTo) {
      if (!on) return; var c = ac(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + at;
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
    }
    return {
      context: ac,
      isOn: function () { return on; },
      set: function (v) { on = v; store('sr_sound', v); },
      unlock: function () { if (on) ac(); },
      tick: function () { tone(1000, 0, 0.05, 'square', 0.035); },
      stamp: function () { tone(110, 0, 0.18, 'sine', 0.2, 50); },
      correct: function () { [523, 659, 784].forEach(function (f, i) { tone(f, i * 0.09, 0.22, 'triangle', 0.1); }); },
      wrong: function () { tone(240, 0, 0.35, 'sawtooth', 0.07, 110); },
      timeout: function () { tone(180, 0, 0.5, 'sawtooth', 0.07, 70); },
      resurrect: function () { [392, 494, 587, 784, 988].forEach(function (f, i) { tone(f, i * 0.1, 0.5, 'sine', 0.07); }); },
      win: function () { [523, 523, 523, 659, 784, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.13, 0.3, 'triangle', 0.1); }); },
      lose: function () { [330, 294, 262, 196].forEach(function (f, i) { tone(f, i * 0.22, 0.45, 'sawtooth', 0.05); }); }
    };
  })();

  // ---------- state ----------
  var S = null;
  var timer = { running: false, left: CFG.seconds, last: 0, raf: 0, lastShown: CFG.seconds, startT: 0 };
  var nextLockUntil = 0;

  function newGame() {
    S = { id: Date.now().toString(36), picks: pickRiddles(), i: 0, lives: CFG.lives, score: 0, streak: 0, solved: 0, history: [], phase: 'idle', lastWrong: false, log: [], cur: null };
  }

  // 3 easy / 4 medium / 3 hard, preferring riddles not seen recently
  function pickRiddles() {
    var seen = store('sr_seen') || [];
    var chosen = [];
    [1, 2, 3].forEach(function (d) {
      var need = CFG.mix.filter(function (x) { return x === d; }).length;
      var tier = RIDDLES.filter(function (r) { return r.d === d; });
      var fresh = tier.filter(function (r) { return seen.indexOf(r.id) < 0; });
      if (fresh.length < need) {                       // tier exhausted: forget this tier's history
        seen = seen.filter(function (id) { return !tier.some(function (r) { return r.id === id; }); });
        fresh = tier;
      }
      chosen = chosen.concat(shuffle(fresh).slice(0, need));
    });
    store('sr_seen', seen.concat(chosen.map(function (r) { return r.id; })));
    return chosen.sort(function (a, b) { return a.d - b.d; });
  }

  // ---------- screens / HUD ----------
  var SCREENS = ['title', 'brief', 'riddle', 'resurrect', 'lose', 'win'];
  function show(name) {
    SCREENS.forEach(function (n) { els['screen-' + n].hidden = n !== name; });
    var min = name === 'title' || name === 'brief';
    els.hud.classList.toggle('min', min);
    document.body.dataset.mood = name;        // the sky changes with the story (CSS)
    Music.setMood({ title: 'calm', brief: 'calm', riddle: 'play', resurrect: 'calm', win: 'win', lose: 'lose' }[name] || 'calm');
    timer.urgentOn = false;
    window.scrollTo(0, 0);
  }
  function renderLives(justLost) {
    els.lives.textContent = '';
    for (var i = 0; i < CFG.lives; i++) {
      var ns = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(ns, 'svg');
      var lost = i >= S.lives;
      svg.setAttribute('class', 'life' + (lost ? ' lost' : '') + (justLost && i === S.lives ? ' just-lost' : ''));
      var use = document.createElementNS(ns, 'use'); use.setAttribute('href', lost ? '#ico-lens-x' : '#ico-lens');
      svg.appendChild(use); els.lives.appendChild(svg);
    }
    els.lives.setAttribute('aria-label', S.lives + (S.lives === 1 ? ' life left' : ' lives left'));
  }
  function renderHud() {
    renderLives(false);
    els.progress.textContent = 'Case file ' + Math.min(S.i + 1, CFG.riddles) + ' / ' + CFG.riddles;
    els.score.textContent = S.score;
  }
  function renderBest() {
    var best = store('sr_best'), played = store('sr_games') || 0, wins = store('sr_wins') || 0;
    els['best-line'].textContent = played
      ? 'Personal best ' + best + ' · Cases solved ' + wins + ' of ' + played + ' played'
      : 'Your first case awaits.';
  }

  // ---------- timer ----------
  function drawClock() {
    var frac = Math.max(0, timer.left / CFG.seconds);
    els['clock-ring'].style.strokeDashoffset = String(RING * (1 - frac));
    var shown = Math.max(0, Math.ceil(timer.left));
    els['clock-num'].textContent = shown;
    var urgent = timer.left <= CFG.urgent;
    els.clock.classList.toggle('urgent', urgent);
    if (urgent && timer.running && !timer.urgentOn) { timer.urgentOn = true; Music.setMood('urgent'); }
    if (shown !== timer.lastShown) {
      timer.lastShown = shown;
      if (urgent && shown > 0) Sound.tick();
      if (shown === 10) announce('10 seconds left');
      if (shown === 5) announce('5 seconds left');
    }
  }
  function startTimer() {
    timer.left = CFG.seconds; timer.lastShown = CFG.seconds; timer.running = true;
    els.clock.classList.remove('paused'); drawClock();
    timer.last = performance.now(); timer.startT = timer.last;
    cancelAnimationFrame(timer.raf);
    timer.raf = requestAnimationFrame(loop);
  }
  function stopTimer() { timer.running = false; cancelAnimationFrame(timer.raf); els.clock.classList.add('paused'); }
  function loop(ts) {
    if (!timer.running) return;
    var dt = Math.min(0.1, (ts - timer.last) / 1000);   // clamp: a backgrounded tab doesn't burn the clock
    timer.last = ts; timer.left -= dt;
    if (timer.left <= 0) { timer.left = 0; drawClock(); resolve('timeout'); return; }
    drawClock();
    timer.raf = requestAnimationFrame(loop);
  }

  // ---------- flow ----------
  function startGame(skipBrief) {
    Sound.unlock(); Music.start();
    newGame();
    renderHud();
    if (skipBrief) beginRiddle(); else { show('brief'); els['btn-begin'].focus({ preventScroll: true }); }
  }

  function beginRiddle() {
    var r = S.picks[S.i];
    S.phase = 'asking';
    S.cur = { id: r.id, d: r.d, guesses: [] };
    show('riddle');
    renderHud();
    els['case-no'].textContent = 'No. ' + (S.i + 1) + ' · ' + ['', 'Warm-up', 'Getting tricky', 'Fiendish'][r.d];
    els['riddle-text'].textContent = r.t;
    // restart the ink animation
    els['riddle-text'].style.animation = 'none'; void els['riddle-text'].offsetWidth; els['riddle-text'].style.animation = '';
    els.feedback.hidden = true;
    els['answer-form'].hidden = false;
    els.answer.value = ''; els.nudge.textContent = '';
    els['btn-submit'].disabled = false; els.answer.disabled = false;
    els.clock.classList.add('paused'); els.clock.classList.remove('urgent');
    timer.left = CFG.seconds; timer.lastShown = CFG.seconds; drawClock();
    els.answer.focus({ preventScroll: true });
    announce('Riddle ' + (S.i + 1) + ': ' + r.t);
    setTimeout(function () { if (S.phase === 'asking' && S.picks[S.i] === r && !timer.running) startTimer(); }, CFG.startDelay);
  }

  function submit(e) {
    e.preventDefault();
    if (S.phase !== 'asking') return;
    var r = S.picks[S.i];
    var res = Matcher.check(r, els.answer.value);
    if (res.status === 'empty') { els.answer.focus(); return; }
    S.cur.guesses.push({ t: els.answer.value.trim().slice(0, 40), s: res.status + (res.fuzzy ? '~' : '') });
    if (res.status === 'multiword') {
      els.nudge.textContent = 'One word, Detective. We’re on a budget. (No life lost.)';
      els.answer.classList.remove('shake'); void els.answer.offsetWidth; els.answer.classList.add('shake');
      els.answer.select(); return;
    }
    resolve(res.status === 'correct' ? 'correct' : 'wrong', res);
  }

  function resolve(kind, res) {
    if (S.phase !== 'asking') return;
    S.phase = 'feedback';
    stopTimer();
    Music.setMood('calm'); timer.urgentOn = false;
    var r = S.picks[S.i];
    var remaining = timer.left;
    S.log.push({ id: r.id, d: r.d, out: kind === 'correct' ? 'ok' : kind === 'timeout' ? 'time' : 'bad', sec: Math.round((CFG.seconds - remaining) * 10) / 10, fuzzy: !!(res && res.fuzzy), guesses: S.cur.guesses });
    els.answer.disabled = true; els['btn-submit'].disabled = true;
    els['answer-form'].hidden = true;

    var stamp = els['fb-stamp'], pts = els['fb-points'], quip = els['fb-quip'];
    stamp.classList.remove('bad'); pts.classList.remove('bad');
    var nextLabel = 'Next case';

    if (kind === 'correct') {
      S.streak++; S.solved++; S.lastWrong = false;
      var tb = Math.round(CFG.timeBonus * remaining / CFG.seconds);
      var sb = Math.min(CFG.streakCap, CFG.streakStep * (S.streak - 1));
      var gain = CFG.base + tb + sb;
      S.score += gain; S.history.push('ok');
      stamp.textContent = 'SOLVED';
      var line = S.streak >= 3 ? pick('streak') : (CFG.seconds - remaining < 5 ? pick('fast') : pick('praise'));
      setLine(els['fb-line'], line, { n: S.streak });
      pts.textContent = '+' + gain + ' pts  (' + CFG.base + ' base · ' + tb + ' speed' + (sb ? ' · ' + sb + ' streak' : '') + ')';
      quip.textContent = (res && res.fuzzy ? pick('forgiven') + ' ' : '') + r.q;
      Sound.stamp(); setTimeout(Sound.correct, 120);
      if (S.i >= CFG.riddles - 1) nextLabel = 'Close the case';
    } else {
      S.streak = 0; S.lives--; S.lastWrong = true;
      S.history.push(kind === 'timeout' ? 'time' : 'bad');
      stamp.classList.add('bad'); pts.classList.add('bad');
      stamp.textContent = kind === 'timeout' ? 'TIME’S UP' : 'UNSOLVED';
      setLine(els['fb-line'], pick(kind === 'timeout' ? 'timeout' : 'wrong'));
      pts.textContent = '−1 life';
      quip.textContent = r.q;
      renderLives(true);
      Sound.stamp(); setTimeout(kind === 'timeout' ? Sound.timeout : Sound.wrong, 120);
      nextLabel = S.lives <= 0 ? 'Face the music' : 'Continue';
    }
    els['fb-answer'].textContent = r.a;
    els.score.textContent = S.score;
    els['btn-next'].textContent = nextLabel;
    els.feedback.hidden = false;
    nextLockUntil = Date.now() + CFG.nextLock;
    els['btn-next'].focus({ preventScroll: true });
    announce((kind === 'correct' ? 'Correct. ' : kind === 'timeout' ? 'Time is up. ' : 'Wrong. ') + 'The answer was ' + r.a + '. ' + (kind === 'correct' ? '' : S.lives + ' lives left.'));
  }

  function afterFeedback() {
    if (S.phase !== 'feedback' || Date.now() < nextLockUntil) return;
    if (S.lastWrong) {
      if (S.lives <= 0) return endGame(false);
      return showResurrection();
    }
    advance();
  }
  function advance() {
    if (S.i >= CFG.riddles - 1) return endGame(true);
    S.i++; beginRiddle();
  }

  function showResurrection() {
    S.phase = 'resurrect';
    show('resurrect');
    renderHud();
    setLine(els['res-line'], pick('resurrect'));
    els['res-lives'].textContent = S.lives === 1 ? 'Only one life left. Make it count.' : S.lives + ' lives remaining.';
    els['btn-resume'].textContent = S.i >= CFG.riddles - 1 ? 'To the verdict' : 'Back to work';
    Sound.resurrect();
    els['btn-resume'].focus({ preventScroll: true });
    announce('You have died. Resurrected. ' + S.lives + ' lives remaining.');
  }

  // ---------- results ----------
  function rankFor(won) {
    if (!won) return S.solved < 3 ? 0 : S.solved < 6 ? 1 : 2;
    if (S.score >= 1600 && S.lives >= 2) return 5;
    return S.score >= 1100 ? 4 : 3;
  }
  function gridText() {
    var map = { ok: '🔍', bad: '💀', time: '⏳' }, out = '';
    for (var i = 0; i < CFG.riddles; i++) out += S.history[i] ? map[S.history[i]] : '⬛';
    return out;
  }
  function cell(num, cap, cls) {
    var d = document.createElement('div'); d.className = 'cell' + (cls ? ' ' + cls : '');
    var n = document.createElement('span'); n.className = 'num'; n.textContent = num;
    var c = document.createElement('span'); c.className = 'cap'; c.textContent = cap;
    d.appendChild(n); d.appendChild(c); return d;
  }
  function endGame(won) {
    S.phase = 'end'; S.won = won;
    stopTimer();
    var rank = rankFor(won);
    S.rank = rank;

    var prevBest = store('sr_best') || 0;
    var newBest = S.score > prevBest;
    store('sr_games', (store('sr_games') || 0) + 1);
    if (won) store('sr_wins', (store('sr_wins') || 0) + 1);
    if (newBest) store('sr_best', S.score);

    var target = won ? els['win-summary'] : els['lose-summary'];
    target.textContent = '';
    target.appendChild(cell(S.solved + '/' + CFG.riddles, 'Solved'));
    target.appendChild(cell(S.score, 'Score'));
    target.appendChild(cell(S.lives, S.lives === 1 ? 'Life left' : 'Lives left'));
    var rk = cell(COPY.ranks[rank], 'Detective rank', 'rank');
    var medal = document.createElement('div'); medal.className = 'medal'; medal.setAttribute('aria-hidden', 'true');
    var msvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    var muse = document.createElementNS('http://www.w3.org/2000/svg', 'use'); muse.setAttribute('href', '#rk' + rank);
    msvg.appendChild(muse); medal.appendChild(msvg); rk.insertBefore(medal, rk.firstChild);
    var sub = document.createElement('span'); sub.className = 'sub'; sub.textContent = COPY.ranksSub[rank]; rk.appendChild(sub);
    target.appendChild(rk);
    var g = cell(gridText(), 'Your case file', 'grid'); target.appendChild(g);
    var pb = document.createElement('div'); pb.className = 'cell pb';
    pb.textContent = newBest && S.score > 0 ? '★ New personal best! ★' : 'Personal best: ' + Math.max(prevBest, S.score);
    target.appendChild(pb);

    els['copied-win'].textContent = ''; els['copied-lose'].textContent = '';
    renderHud();
    if (won) {
      show('win'); setLine(els['win-line'], pick('win')); Sound.win(); confetti();
      els['btn-again'].focus({ preventScroll: true });
      announce('Case solved! Rank: ' + COPY.ranks[rank] + '. Score ' + S.score + '.');
    } else {
      show('lose'); setLine(els['lose-line'], pick('lose')); Sound.lose();
      els['btn-retry'].focus({ preventScroll: true });
      announce('You have been found, Detective. Score ' + S.score + '.');
    }
    renderBest();
    if (PLAYTEST) playtestPanel(won);
  }


  // ---------- playtest mode (?playtest) ----------
  // Logs every riddle (outcome, seconds used, every guess typed) plus a short rating form,
  // all kept in this browser only. Players copy the data out; playtest/analyze.js reads it.
  var PT_KEY = 'sr_playtest';
  function ptAll() { return store(PT_KEY) || []; }
  function playtestPanel(won) {
    var card = (won ? els['screen-win'] : els['screen-lose']).querySelector('.paper');
    var old = card.querySelector('.pt'); if (old) old.parentNode.removeChild(old);
    var rec = {
      v: 1, id: S.id || (S.id = Date.now().toString(36)), at: new Date().toISOString(), won: won, score: S.score, solved: S.solved, lives: S.lives,
      rank: COPY.ranks[S.rank], riddles: S.log,
      device: { w: window.innerWidth, h: window.innerHeight, touch: 'ontouchstart' in window, sound: Sound.isOn(), music: Music.isOn() },
      ratings: {}, notes: ''
    };
    var all = ptAll().filter(function (g) { return g.id !== rec.id; }); all.push(rec); store(PT_KEY, all);

    var box = document.createElement('form'); box.className = 'pt'; box.setAttribute('aria-label', 'Playtest feedback');
    var h = document.createElement('h3'); h.textContent = 'Playtest notes'; box.appendChild(h);
    var intro = document.createElement('p'); intro.className = 'pt-intro'; intro.textContent = 'Quick gut ratings, 1 (nope) to 5 (yes!). Honest beats polite.'; box.appendChild(intro);
    [['fun', 'That was fun'], ['funny', 'It made me laugh or smile'], ['fair', 'The difficulty felt fair'], ['time', '20 seconds felt right'], ['look', 'I liked how it looks and sounds']].forEach(function (q) {
      var fs = document.createElement('fieldset'); var lg = document.createElement('legend'); lg.textContent = q[1]; fs.appendChild(lg);
      for (var n = 1; n <= 5; n++) {
        var lb = document.createElement('label'); var inp = document.createElement('input'); inp.type = 'radio'; inp.name = q[0]; inp.value = n;
        var sp = document.createElement('span'); sp.textContent = n; lb.appendChild(inp); lb.appendChild(sp); fs.appendChild(lb);
      }
      box.appendChild(fs);
    });
    var ta = document.createElement('textarea'); ta.rows = 3; ta.maxLength = 500; ta.placeholder = 'Any answer you felt was unfairly rejected or accepted? Anything confusing? Best / worst moment?';
    ta.setAttribute('aria-label', 'Notes'); box.appendChild(ta);
    var row = document.createElement('div'); row.className = 'actions';
    var save = document.createElement('button'); save.type = 'submit'; save.className = 'btn btn-ghost'; save.textContent = 'Save notes';
    var copy = document.createElement('button'); copy.type = 'button'; copy.className = 'btn btn-ghost'; copy.textContent = 'Copy all playtest data';
    var msg = document.createElement('p'); msg.className = 'copied'; msg.setAttribute('role', 'status');
    row.appendChild(save); row.appendChild(copy); box.appendChild(row); box.appendChild(msg);
    box.addEventListener('submit', function (e) {
      e.preventDefault();
      box.querySelectorAll('input:checked').forEach(function (i) { rec.ratings[i.name] = +i.value; });
      rec.notes = ta.value.trim();
      var list = ptAll().map(function (g) { return g.id === rec.id ? rec : g; }); store(PT_KEY, list);
      msg.textContent = 'Saved. Thank you, Detective.';
    });
    copy.addEventListener('click', function () {
      var text = JSON.stringify(ptAll());
      function done(ok) { msg.textContent = ok ? 'Copied ' + ptAll().length + ' game(s). Paste them to the facilitator.' : 'Copy failed: open the console and run copy(localStorage.sr_playtest)'; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallbackCopy(text, done); });
      else fallbackCopy(text, done);
    });
    card.insertBefore(box, card.querySelector('.actions'));
  }

  function shareText() {
    return 'Speed Riddlemaster 🕵️ — ' + (S.won ? 'CASE SOLVED' : 'FOUND, DETECTIVE') + '\n' +
      COPY.ranks[S.rank] + ' · ' + S.score + ' pts\n' + gridText() + '\n' +
      (location.protocol.indexOf('http') === 0 ? location.href.split('?')[0] : '');
  }
  function copyResult(outId) {
    var text = shareText().trim(), out = els[outId];
    function done(ok) { out.textContent = ok ? 'Copied to clipboard. Go brag.' : 'Couldn’t copy. Select it from the grid above instead.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallbackCopy(text, done); });
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta); done(ok);
  }

  function confetti() {
    if (reduceMotion) return;
    var colors = ['#d9a441', '#c4602b', '#f1e4c3', '#2f6b4f', '#1d4a56', '#a8201a'];
    for (var i = 0; i < 70; i++) {
      var c = document.createElement('i'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 2.4 + Math.random() * 2.6 + 's';
      c.style.animationDelay = Math.random() * 0.9 + 's';
      c.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      document.body.appendChild(c);
      (function (n) { setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 6500); })(c);
    }
  }

  // ---------- wiring ----------
  function syncSoundBtn() {
    els['sound-btn'].setAttribute('aria-pressed', String(Sound.isOn()));
    els['sound-ico'].textContent = Sound.isOn() ? '♪' : '✕';
  }
  function syncMusicBtn() {
    els['music-btn'].setAttribute('aria-pressed', String(Music.isOn()));
    els['music-ico'].textContent = Music.isOn() ? '♫' : '✕';
  }
  els['music-btn'].addEventListener('click', function () { Sound.unlock(); Music.setEnabled(!Music.isOn()); syncMusicBtn(); });
  // first tap anywhere starts the score (browsers need a user gesture)
  document.addEventListener('pointerdown', function () { Sound.unlock(); Music.start(); }, { once: true });
  els['sound-btn'].addEventListener('click', function () { Sound.set(!Sound.isOn()); syncSoundBtn(); Sound.unlock(); if (Sound.isOn()) Sound.tick(); });
  els['btn-open'].addEventListener('click', function () { startGame(false); });
  els['btn-begin'].addEventListener('click', beginRiddle);
  els['answer-form'].addEventListener('submit', submit);
  els['btn-next'].addEventListener('click', afterFeedback);
  els['btn-resume'].addEventListener('click', advance);
  els['btn-retry'].addEventListener('click', function () { startGame(true); });
  els['btn-again'].addEventListener('click', function () { startGame(true); });
  els['btn-share-lose'].addEventListener('click', function () { copyResult('copied-lose'); });
  els['btn-share-win'].addEventListener('click', function () { copyResult('copied-win'); });

  // Enter advances from the feedback screen even if focus drifted
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && S && S.phase === 'feedback' && e.target.tagName !== 'BUTTON') { e.preventDefault(); afterFeedback(); }
  });

  // ---------- init ----------
  if (PLAYTEST) { var rb = document.createElement('div'); rb.className = 'pt-ribbon'; rb.textContent = 'Playtest mode: your guesses and times are recorded locally'; document.body.appendChild(rb); }
  newGame();                         // so HUD helpers have state
  els.hud.hidden = false;
  Music.init(Sound.context);
  if (store('sr_music') === false) Music.setEnabled(false);
  renderHud(); renderBest(); syncSoundBtn(); syncMusicBtn();
  show('title');
  els['btn-open'].focus({ preventScroll: true });

  if (/[?&]debug\b/.test(location.search)) {
    window.SR_DEBUG = { playtest: PLAYTEST, state: function () { return S; }, answer: function () { return S.picks[S.i].a; }, timer: timer };
  }
})();
