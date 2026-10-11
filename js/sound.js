/* WebAudio 효과음 (외부 파일 없이 합성). assets.js 의 sounds 에 파일을 지정하면 그 파일 사용 */
(function (root) {
  'use strict';
  var ctx = null, master = null, muted = false, buffers = {};
  var files = (root.HG_ASSETS && root.HG_ASSETS.sounds) || {};

  function ensure() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      var comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      Object.keys(files).forEach(function (k) {
        if (!files[k]) return;
        fetch(files[k]).then(function (r) { return r.arrayBuffer(); })
          .then(function (b) { return new Promise(function (ok, ng) { ctx.decodeAudioData(b, ok, ng); }); })
          .then(function (buf) { buffers[k] = buf; })
          .catch(function () { /* 파일 실패 시 합성음 사용 */ });
      });
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noiseBuffer(sec) {
    var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function env(g, t, a, peak, d, end) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    return t + a + d + (end || 0);
  }

  function tone(type, f0, f1, t, dur, peak, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.01, peak, dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.05);
    return { o: o, g: g };
  }

  function swish(t, dur, f, peak) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuffer(dur + 0.05);
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(f, t); bp.frequency.exponentialRampToValueAtTime(f * 0.55, t + dur);
    var g = ctx.createGain(); env(g, t, 0.008, peak, dur);
    s.connect(bp); bp.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.06);
  }

  var synth = {
    flip: function (t) { swish(t, 0.09, 4800, 0.55); swish(t + 0.075, 0.12, 3600, 0.5); },
    // 경적: 빵~ (장3도 두 음)
    bell0: function (t) {
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.connect(master);
      tone('sawtooth', 392, 0, t, 0.5, 0.28, lp); tone('sawtooth', 494, 0, t, 0.5, 0.26, lp);
      tone('square', 196, 0, t, 0.5, 0.12, lp);
    },
    // 오리: 꽥꽥
    bell1: function (t) {
      [0, 0.22].forEach(function (d) {
        var o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(620, t + d); o.frequency.exponentialRampToValueAtTime(300, t + d + 0.17);
        bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 3.2;
        env(g, t + d, 0.012, 0.9, 0.17);
        o.connect(bp); bp.connect(g); g.connect(master);
        o.start(t + d); o.stop(t + d + 0.22);
      });
    },
    // 환호성: 와~ (노이즈 + 올라가는 소리)
    bell2: function (t) {
      var s = ctx.createBufferSource(); s.buffer = noiseBuffer(1.0);
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(1200, t); bp.frequency.linearRampToValueAtTime(2600, t + 0.6);
      var g = ctx.createGain(); env(g, t, 0.18, 0.7, 0.7);
      s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + 1.0);
      var o = ctx.createOscillator(), og = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.55);
      lfo.frequency.value = 9; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
      env(og, t, 0.12, 0.28, 0.6); o.connect(og); og.connect(master);
      o.start(t); lfo.start(t); o.stop(t + 0.85); lfo.stop(t + 0.85);
    },
    // 딩동 벨
    bell3: function (t) {
      [[1, 0.5], [2.76, 0.28], [5.4, 0.14]].forEach(function (p) {
        tone('sine', 880 * p[0], 0, t, 1.1 / p[0] + 0.25, 0.35 * p[1] * 2);
      });
      [[1, 0.5], [2.76, 0.28]].forEach(function (p) {
        tone('sine', 660 * p[0], 0, t + 0.2, 1.0 / p[0] + 0.25, 0.3 * p[1] * 2);
      });
    },
    correct: function (t) {
      [523, 659, 784, 1047].forEach(function (f, i) { tone('triangle', f, 0, t + i * 0.07, 0.32, 0.3); });
    },
    wrong: function (t) {
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(master);
      tone('sawtooth', 140, 90, t, 0.38, 0.45, lp); tone('square', 70, 60, t, 0.38, 0.3, lp);
    },
    win: function (t) {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone('triangle', f, 0, t + i * 0.12, 0.4, 0.3); });
    },
    out: function (t) { tone('sine', 400, 120, t, 0.45, 0.35); }
  };

  function play(name, delay) {
    if (muted) return;
    if (!ensure()) return;
    var t = ctx.currentTime + (delay || 0);
    var buf = buffers[name];
    if (buf) {
      var s = ctx.createBufferSource(); s.buffer = buf; s.connect(master); s.start(t);
    } else if (synth[name]) synth[name](t);
  }

  root.HGSound = {
    play: play,
    unlock: ensure,
    setMuted: function (m) { muted = !!m; },
    isMuted: function () { return muted; }
  };
})(window);
