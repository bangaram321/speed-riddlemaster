/*
 * Speed Riddlemaster — forgiving answer matcher (PRD FR-10 … FR-14)
 *
 * Pure functions, no DOM. Works in the browser (window.Matcher) and in Node.
 *
 *   Matcher.check(riddle, rawInput) ->
 *     { status: 'correct',  fuzzy: boolean, matched: string }
 *     { status: 'wrong' }
 *     { status: 'multiword' }   // several unrelated words: nudge, no penalty
 *     { status: 'empty' }
 */
(function (root) {
  var FILLER = {
    a: 1, an: 1, the: 1, its: 1, it: 1, is: 1, i: 1, im: 1, think: 1, maybe: 1,
    my: 1, answer: 1, guess: 1, are: 1, they: 1, thats: 1, that: 1, of: 1,
    um: 1, uh: 1, hmm: 1, oh: 1, probably: 1, perhaps: 1, bet: 1
  };

  function normalize(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip accents
      .replace(/['’`]/g, '')                              // it's -> its
      .replace(/[^a-z0-9\s]/g, ' ')                       // punctuation -> space
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Optimal-string-alignment distance (insert / delete / substitute / adjacent swap)
  function distance(a, b) {
    var al = a.length, bl = b.length, i, j;
    if (!al) return bl;
    if (!bl) return al;
    var d = [];
    for (i = 0; i <= al; i++) { d[i] = [i]; }
    for (j = 0; j <= bl; j++) { d[0][j] = j; }
    for (i = 1; i <= al; i++) {
      for (j = 1; j <= bl; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[al][bl];
  }

  // How many typos are we willing to forgive for an answer of this length?
  function allowedTypos(len) {
    if (len <= 3) return 0;
    if (len <= 6) return 1;
    return 2;
  }

  // singular/plural neighbours of a word (card <-> cards, box <-> boxes)
  function forms(w) {
    var out = [w, w + 's', w + 'es'];
    if (w.length > 3 && /s$/.test(w)) out.push(w.slice(0, -1));
    if (w.length > 4 && /es$/.test(w)) out.push(w.slice(0, -2));
    if (w.length > 4 && /ies$/.test(w)) out.push(w.slice(0, -3) + 'y');
    return out;
  }

  // "tooowel" -> "towel"
  function squash(w) { return w.replace(/(.)\1{2,}/g, '$1'); }

  function inList(list, word) {
    var f = forms(word);
    for (var i = 0; i < list.length; i++) {
      for (var j = 0; j < f.length; j++) if (list[i] === f[j]) return true;
    }
    return false;
  }

  function exactHit(targets, word) {
    var f = forms(word).concat(forms(squash(word)));
    for (var i = 0; i < targets.length; i++) {
      for (var j = 0; j < f.length; j++) if (targets[i] === f[j]) return targets[i];
    }
    return null;
  }

  function fuzzyHit(targets, word) {
    var cands = [word, squash(word)];
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i], max = allowedTypos(t.length);
      if (!max) continue;
      for (var j = 0; j < cands.length; j++) {
        var c = cands[j];
        if (Math.abs(c.length - t.length) > max) continue;
        if (distance(c, t) <= max) return t;
      }
    }
    return null;
  }

  function checkWord(riddle, word) {
    var targets = [normalize(riddle.a)].concat((riddle.acc || []).map(normalize));
    var rejects = (riddle.rej || []).map(normalize);

    var hit = exactHit(targets, word);
    if (hit) return { status: 'correct', fuzzy: false, matched: hit };

    // a real-but-different word is never "a typo"
    if (inList(rejects, word) || inList(rejects, squash(word))) return { status: 'wrong' };

    hit = fuzzyHit(targets, word);
    if (hit) return { status: 'correct', fuzzy: true, matched: hit };
    return { status: 'wrong' };
  }

  function check(riddle, raw) {
    var norm = normalize(raw);
    if (!norm) return { status: 'empty' };

    var tokens = norm.split(' ').filter(function (t) { return t && !FILLER[t]; });
    if (!tokens.length) return { status: 'empty' };

    if (tokens.length === 1) return checkWord(riddle, tokens[0]);

    // Several words: the joined form (tea pot -> teapot), then each word on its own
    var joined = checkWord(riddle, tokens.join(''));
    if (joined.status === 'correct') return joined;
    for (var i = 0; i < tokens.length; i++) {
      var r = checkWord(riddle, tokens[i]);
      if (r.status === 'correct') return r;
    }
    return { status: 'multiword' };
  }

  var api = { check: check, normalize: normalize, distance: distance, allowedTypos: allowedTypos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Matcher = api;
})(typeof window !== 'undefined' ? window : this);
