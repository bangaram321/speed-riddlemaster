/*
 * Speed Riddlemaster — procedural noir-jazz score (no audio files).
 *
 * A slow, swung D-minor loop played by synthesised upright bass, electric piano,
 * brushed kit, a muted-trumpet melody and a bed of rain. It has four moods that
 * change as the story changes:
 *
 *   calm    title, briefing, feedback, resurrection  -> bass + rain + sparse keys
 *   play    while a riddle is on screen              -> full trio feel
 *   urgent  last 5 seconds of the timer              -> heartbeat kick + ticking hat
 *   win     case solved                              -> brighter, fuller
 *   lose    found, detective                         -> thin and wistful
 *
 * API:  Music.init(getAudioContext)   Music.start()   Music.stop()
 *       Music.setMood(name)           Music.setEnabled(bool)   Music.isOn()
 *       Music.renderStats(mood, seconds)  -> Promise  (offline render for level checks)
 */
(function (root) {
  var BPM = 74, BEAT = 60 / BPM, SWING = 0.63;     // off-beat lands 63% into the beat
  var MASTER = 1.6;                                 // overall music level (measured: play ≈ -29 dBFS RMS, peaks < 0.55)

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // 8-bar form: i - i - iv - V7b9 | i - bVImaj7 - iiø - V7b9
  var FORM = [
    { root: 38, third: 3, tones: [53, 57, 60, 64] },   // Dm9
    { root: 38, third: 3, tones: [53, 57, 60, 65] },   // Dm11
    { root: 43, third: 3, tones: [58, 62, 65, 69] },   // Gm9
    { root: 45, third: 4, tones: [55, 61, 64, 70] },   // A7b9
    { root: 38, third: 3, tones: [53, 57, 60, 64] },   // Dm9
    { root: 46, third: 4, tones: [57, 62, 65, 69] },   // Bbmaj7
    { root: 40, third: 3, tones: [55, 58, 62, 64] },   // Em7b5
    { root: 45, third: 4, tones: [55, 61, 64, 70] }    // A7b9
  ];
  var MEL_SCALE = [62, 65, 67, 68, 69, 72, 74, 77];    // D minor blues colour (Ab = blue note)

  var MOODS = {
    calm:   { bass: .55, comp: .35, ride: 0,   kick: 0,   mel: .12, hat8: 0, vol: .8 },
    play:   { bass: .85, comp: 1,   ride: 1,   kick: .6,  mel: .55, hat8: 0, vol: .9 },
    urgent: { bass: 1,   comp: 1,   ride: 1,   kick: 1,   mel: 0,   hat8: 1, vol: 1 },
    win:    { bass: .9,  comp: 1,   ride: 1,   kick: .7,  mel: .9,  hat8: 0, vol: 1 },
    lose:   { bass: .45, comp: .3,  ride: 0,   kick: 0,   mel: .08, hat8: 0, vol: .7 }
  };

  // ---------------------------------------------------------------- engine
  function createEngine(ctx, out) {
    var panCap = !!ctx.createStereoPanner;
    function pan(node, p) {
      if (!panCap) return node;
      var s = ctx.createStereoPanner(); s.pan.value = p; node.connect(s); return s;
    }
    function env(g, t, a, peak, d) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    }

    // shared noise buffers
    var sr = ctx.sampleRate;
    var white = ctx.createBuffer(1, sr, sr), wd = white.getChannelData(0);
    for (var i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    var brown = ctx.createBuffer(1, sr * 4, sr), bd = brown.getChannelData(0), last = 0;
    for (i = 0; i < bd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.2; }

    function noiseBurst(t, dur, type, freq, q, vol, p) {
      var src = ctx.createBufferSource(); src.buffer = white;
      src.playbackRate.value = 0.8 + Math.random() * 0.4;
      var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      var g = ctx.createGain(); env(g, t, 0.004, vol, dur);
      src.connect(f); f.connect(g); pan(g, p || 0).connect(out);
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    }

    // ---- voices
    function bass(t, midi, vol) {
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'sine'; o.frequency.value = mtof(midi);
      o2.type = 'triangle'; o2.frequency.value = mtof(midi) * 2;
      var g2 = ctx.createGain(); g2.gain.value = 0.35;
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(260, t + BEAT * 0.8);
      env(g, t, 0.01, 0.2 * vol, BEAT * 0.85);
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); pan(lp, -0.05).connect(out);
      o.start(t); o2.start(t); o.stop(t + BEAT); o2.stop(t + BEAT);
    }
    function keys(t, tones, vol, len) {
      tones.forEach(function (m, idx) {
        var tt = t + idx * 0.012;                         // gentle strum
        var f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 2400;
        env(g, tt, 0.006, 0.05 * vol, len);
        [[1, 'sine', 1], [2, 'sine', 0.28], [3.01, 'sine', 0.06], [1.004, 'triangle', 0.22]].forEach(function (p) {
          var o = ctx.createOscillator(), og = ctx.createGain();
          o.type = p[1]; o.frequency.value = f * p[0]; og.gain.value = p[2];
          o.connect(og); og.connect(g); o.start(tt); o.stop(tt + len + 0.1);
        });
        g.connect(lp); pan(lp, -0.28).connect(out);
      });
    }
    function trumpet(t, midi, dur, vol) {
      var o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(),
          g = ctx.createGain(), bp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = mtof(midi);
      lfo.frequency.value = 5.2; lg.gain.value = mtof(midi) * 0.006; lfo.connect(lg); lg.connect(o.frequency);
      bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.9;
      lp.type = 'lowpass'; lp.frequency.value = 2200;
      env(g, t, 0.05, 0.05 * vol, dur);
      o.connect(bp); bp.connect(lp); lp.connect(g); pan(g, 0.3).connect(out);
      o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    }
    function kick(t, vol) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      env(g, t, 0.004, 0.16 * vol, 0.16);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.25);
    }

    var rainSrc = null;
    function startRain() {
      if (rainSrc) return;
      var src = ctx.createBufferSource(); src.buffer = brown; src.loop = true;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
      var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
      var g = ctx.createGain(); g.gain.value = 0.055;
      src.connect(lp); lp.connect(hp); hp.connect(g); g.connect(out);
      src.start(); rainSrc = src;
    }
    function stopRain() { if (rainSrc) { try { rainSrc.stop(); } catch (e) {} rainSrc = null; } }

    var melodyIdx = 3;
    function phrase(t0, m) {
      var slots = [0.63, 1, 1.63, 2, 2.63, 3, 3.63].filter(function () { return Math.random() < 0.55; });
      if (slots.length < 2) slots = [1, 2.63];
      slots.slice(0, 5).forEach(function (pos, k, arr) {
        melodyIdx = Math.max(0, Math.min(MEL_SCALE.length - 1, melodyIdx + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
        var dur = (k === arr.length - 1 ? 1.4 : 0.5) * BEAT;
        trumpet(t0 + swingPos(pos), MEL_SCALE[melodyIdx], dur, m.mel);
      });
    }
    function swingPos(b) { var whole = Math.floor(b), frac = b - whole; return (whole + (frac > 0.5 ? SWING : 0)) * BEAT; }

    // beat index -> sound
    function scheduleBeat(idx, t, m) {
      var bar = Math.floor(idx / 4) % FORM.length, beat = idx % 4, ch = FORM[bar], next = FORM[(bar + 1) % FORM.length];

      // walking bass: root, third, fifth, chromatic approach to the next root
      var approach = next.root + (Math.random() < 0.5 ? -1 : 1);
      var line = [ch.root, ch.root + ch.third, ch.root + 7, approach];
      var bm = line[beat]; while (bm > 52) bm -= 12; while (bm < 33) bm += 12;
      if (m.bass > 0 && (beat !== 2 || m.bass > .5)) bass(t, bm, m.bass * (beat === 0 ? 1.1 : 0.9));

      // piano: charleston comping
      if (m.comp > 0) {
        var strong = m.comp >= 1 || bar % 2 === 0;
        if (beat === 0 && strong) keys(t + 0.004, ch.tones, 0.55 * m.comp, BEAT * 1.2);
        if (beat === 1 && strong) keys(t + SWING * BEAT, ch.tones.slice(1), 0.8 * m.comp, BEAT * 1.0);
      }
      // melody phrases every other bar
      if (beat === 0 && bar % 2 === 0 && m.mel > 0 && Math.random() < m.mel) phrase(t, m);

      // brushes: ride pattern  ding  ding-a  ding  ding-a
      if (m.ride > 0) {
        var v = 0.016 * m.ride;
        noiseBurst(t, 0.18, 'highpass', 6500, 0.7, v * (beat === 0 ? 1.15 : 1), 0.18);
        if (beat === 1 || beat === 3) noiseBurst(t + SWING * BEAT, 0.12, 'highpass', 7200, 0.7, v * 0.8, 0.22);
        if (beat === 1 || beat === 3) noiseBurst(t, 0.22, 'bandpass', 2600, 0.8, 0.028 * m.ride, -0.12);  // brush swish on 2 & 4
      }
      if (m.kick > 0 && (beat === 0 || m.kick >= 1)) kick(t, m.kick * (beat === 0 ? 1 : 0.7));
      // urgent ticking hat on every off-beat
      if (m.hat8 > 0) {
        noiseBurst(t + 0.5 * BEAT, 0.05, 'highpass', 8200, 1, 0.03, 0.1);
        noiseBurst(t, 0.04, 'highpass', 8200, 1, 0.025, 0.1);
      }
    }

    return { scheduleBeat: scheduleBeat, startRain: startRain, stopRain: stopRain };
  }

  // ------------------------------------------------------------ live player
  var getCtx = null, ctx = null, bus = null, engine = null, timer = null;
  var enabled = true, started = false, mood = 'calm', beatIdx = 0, nextT = 0;

  function ensure() {
    if (!getCtx) return false;
    var c = getCtx(); if (!c) return false;
    if (c !== ctx) {
      ctx = c;
      bus = ctx.createGain(); bus.gain.value = 0;
      var comp = ctx.createDynamicsCompressor();             // glue + safety against clipping
      comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
      bus.connect(comp); comp.connect(ctx.destination);
      engine = createEngine(ctx, bus);
    }
    return true;
  }
  function tick() {
    var m = MOODS[mood] || MOODS.calm;
    while (nextT < ctx.currentTime + 0.3) {
      engine.scheduleBeat(beatIdx, nextT, m);
      beatIdx++; nextT += BEAT;
    }
  }
  function applyVolume() {
    if (!bus) return;
    var m = MOODS[mood] || MOODS.calm;
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setTargetAtTime(enabled && started ? MASTER * m.vol : 0, ctx.currentTime, 0.6);
  }

  var api = {
    init: function (fn) { getCtx = fn; },
    isOn: function () { return enabled; },
    start: function () {
      if (!enabled || started || !ensure()) return;
      started = true;
      if (ctx.state === 'suspended') ctx.resume();
      beatIdx = 0; nextT = ctx.currentTime + 0.15;
      engine.startRain(); tick();
      timer = setInterval(tick, 40);
      applyVolume();
    },
    stop: function () {
      if (!started) return;
      started = false; clearInterval(timer); timer = null; applyVolume();
      var e = engine; setTimeout(function () { if (!started && e) e.stopRain(); }, 1800);
    },
    setEnabled: function (on) {
      enabled = !!on;
      try { localStorage.setItem('sr_music', JSON.stringify(enabled)); } catch (e) {}
      if (enabled) api.start(); else api.stop();
    },
    setMood: function (m) { if (MOODS[m]) { mood = m; applyVolume(); } },
    mood: function () { return mood; },

    // Offline render for level/clipping checks (used by the automated checks, not by players)
    renderStats: function (moodName, seconds) {
      var OC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
      if (!OC) return Promise.reject(new Error('no OfflineAudioContext'));
      var rate = 22050, off = new OC(1, Math.ceil(seconds * rate), rate), out = off.createGain(), comp = off.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
      out.gain.value = MASTER * (MOODS[moodName] || MOODS.calm).vol;
      out.connect(comp); comp.connect(off.destination);
      var eng = createEngine(off, out), m = MOODS[moodName] || MOODS.calm;
      eng.startRain();
      for (var i = 0; (i * BEAT) < seconds; i++) eng.scheduleBeat(i, i * BEAT, m);
      return off.startRendering().then(function (buf) {
        var d = buf.getChannelData(0), peak = 0, sum = 0, n = d.length, nan = 0;
        for (var k = 0; k < n; k++) { var v = d[k]; if (v !== v) { nan++; continue; } var a = Math.abs(v); if (a > peak) peak = a; sum += v * v; }
        var seg = Math.floor(n / 8), segRms = [];
        for (var s = 0; s < 8; s++) { var ss = 0; for (var q = s * seg; q < (s + 1) * seg; q++) ss += d[q] * d[q]; segRms.push(Math.sqrt(ss / seg)); }
        return { mood: moodName, seconds: seconds, peak: peak, rms: Math.sqrt(sum / n), nan: nan, segRms: segRms };
      });
    }
  };

  // pause when the tab is hidden
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (!ctx || !started) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Music = api;
})(typeof window !== 'undefined' ? window : this);
