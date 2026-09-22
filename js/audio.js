'use strict';
/* Sons e música sintetizados (WebAudio) — nenhum arquivo de áudio necessário. */
const Sfx = (() => {
  let ctx = null, master = null, musicGain = null, muted = false;
  let musicTimer = null, step = 0, theme = 0;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.35; musicGain.connect(master);
    } catch (e) { ctx = null; }
  }
  const BUF = {};
  function loadBufs() {
    if (!ctx || typeof SFX_DATA === 'undefined' || BUF._done) return;
    BUF._done = true;
    for (const k in SFX_DATA) {
      try {
        const bin = atob(SFX_DATA[k]), n = bin.length >> 1, buf = ctx.createBuffer(1, n, SFX_RATE), d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) { let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); if (v > 32767) v -= 65536; d[i] = v / 32768; }
        BUF[k] = buf;
      } catch (e) { /* usa sintetizado */ }
    }
  }
  function sample(name, rate) {
    if (!ctx || muted || !BUF[name]) return false;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = BUF[name]; src.playbackRate.value = rate || 1; g.gain.value = 0.9;
    src.connect(g); g.connect(master); src.start();
    return true;
  }
  let coinN = 0, coinT = 0;
  function resume() { init(); loadBufs(); if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function tone(freq, dur, type = 'square', vol = 0.12, slide = 0, delay = 0, dest = null) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol = 0.12, delay = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + delay, n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(master); s.start(t);
  }

  const S = {
    coin() { tone(988, .06, 'square', .09); tone(1319, .12, 'square', .09, 0, .05); },
    jump() { tone(300, .16, 'square', .07, 320); },
    djump() { tone(450, .16, 'square', .07, 420); },
    hurt() { tone(220, .25, 'sawtooth', .12, -150); noise(.15, .1); },
    stomp() { tone(180, .1, 'square', .12, -60); tone(320, .1, 'square', .1, 0, .06); },
    star() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .1, 'square', .08, 0, i * .06)); },
    buy() { tone(660, .08, 'triangle', .14); tone(880, .12, 'triangle', .14, 0, .07); },
    pay() { tone(300, .1, 'triangle', .14); tone(220, .16, 'triangle', .14, 0, .08); noise(.1, .06); },
    deposit() { [392, 494, 587].forEach((f, i) => tone(f, .12, 'triangle', .14, 0, i * .07)); },
    select() { tone(700, .05, 'square', .06); },
    ok() { tone(880, .08, 'square', .07); tone(1175, .1, 'square', .07, 0, .07); },
    bad() { tone(200, .3, 'sawtooth', .1, -80); },
    win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, .16, 'square', .09, 0, i * .11)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, .22, 'triangle', .14, 0, i * .16)); },
    cannon() { noise(.2, .12); tone(120, .2, 'square', .1, -60); },
    type() { tone(1400 + Math.random() * 200, .02, 'square', .025); },
    checkpoint() { [523, 784].forEach((f, i) => tone(f, .12, 'triangle', .14, 0, i * .1)); },
  };

  // música: pentatônica simples, um "tema" por fase
  const SCALES = [
    [0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 2, 3, 7, 8], [0, 2, 4, 6, 9], [0, 2, 5, 7, 9], [0, 2, 4, 7, 11],
  ];
  const BASS = [[0, 0, 5, 5], [0, 3, 5, 3], [0, 0, 3, 7], [0, 5, 0, 7], [0, 5, 3, 7], [0, 4, 5, 7]];
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function tick() {
    if (!ctx || muted) return;
    const sc = SCALES[theme % SCALES.length], bass = BASS[theme % BASS.length], root = 57 + (theme * 2) % 5;
    const bar = Math.floor(step / 8) % 4;
    if (step % 2 === 0) {
      const deg = sc[(step * 3 + bar * 2 + (step % 5)) % sc.length];
      const oct = (step % 8 === 6) ? 12 : 0;
      tone(midi(root + 12 + deg + oct), .22, 'square', .05, 0, 0, musicGain);
    }
    if (step % 4 === 0) tone(midi(root - 12 + bass[bar]), .3, 'triangle', .11, 0, 0, musicGain);
    if (step % 2 === 1) noise(.03, .012, 0);
    step++;
  }
  function startMusic(t) {
    theme = t || 0; step = 0; stopMusic();
    if (!ctx) return;
    musicTimer = setInterval(tick, 165);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
  function setMuted(m) { muted = m; if (m) stopMusic(); }
  return Object.assign({}, S, {
    resume, startMusic, stopMusic, setMuted,
    get muted() { return muted; },
    play(name) {
      try {
        let rate = 1;
        if (name === 'coin') { const t = performance.now(); coinN = (t - coinT < 600) ? Math.min(coinN + 1, 7) : 0; coinT = t; rate = 1 + coinN * 0.06; }
        if (sample(name, rate)) return;
        if (S[name]) S[name]();
      } catch (e) { /* ignore */ }
    },
  });
})();
