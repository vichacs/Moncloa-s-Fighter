// Sonido: golpes grabados (assets/audio/sfx_*.mp3) con varias tomas por efecto; lo demás, y cualquier golpe cuyo archivo falte, sintetizado con WebAudio.
(function () {
  // versión de los recursos: la misma ?v= del script; así cada actualización obliga al navegador a descargar las imágenes y sonidos nuevos
  const AV = ((document.currentScript || {}).src || '').split('v=')[1] || '', V = u => AV ? u + (u.includes('?') ? '&' : '?') + 'v=' + AV : u;
  let ctx = null, master = null, musicGain = null, musicTimer = null, step = 0, tempo = 140, muted = /[?&]mudo=1/.test(location.search); /* ?mudo=1: probar sin sonido */

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
    loadSamples();
  }

  // tomas grabadas de cada golpe: se elige una al azar (sin repetir la anterior) y se varía un poco el tono para que no suenen idénticas
  const BANK = { punch: 3, kick: 3, heavy: 2, block: 1, whoosh: 2, fall: 1, motor: 2, choque: 2 }, GAIN = { punch: 1.5, kick: 1.5, heavy: 1.8, block: 1.1, whoosh: 0.7, fall: 1.3, motor: 0.55, choque: 1.4 }; // motor y choque: el coche de Aguirra
  const samples = {}, lastTake = {};
  function loadSamples() {
    for (const k in BANK) {
      samples[k] = [];
      for (let i = 1; i <= BANK[k]; i++) fetch(V('assets/audio/sfx_' + k + i + '.mp3')).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => ctx.decodeAudioData(b)).then(buf => samples[k].push(buf)).catch(() => {});
    }
  }
  function sample(name) {
    const list = samples[name]; if (!ctx || !list || !list.length) return false;
    let i = Math.floor(Math.random() * list.length); if (list.length > 1 && i === lastTake[name]) i = (i + 1) % list.length; lastTake[name] = i;
    const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = list[i]; src.playbackRate.value = 0.92 + Math.random() * 0.16; g.gain.value = GAIN[name] || 1;
    src.connect(g); g.connect(master); src.start(); return true;
  }

  function tone(freq, dur, type, vol, slideTo, dest, when) {
    if (!ctx) return;
    const t = when || ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq, q, when) {
    if (!ctx) return;
    const t = when || ctx.currentTime;
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 0.8;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }

  const ALT = { punch: 'hit', kick: 'hit', hit: 'punch', fall: 'heavy' }; // si falta la grabación de un golpe se usa otra toma o el sonido sintetizado
  const SFX = {
    blip: () => tone(880, 0.06, 'square', 0.12),
    ok: () => { tone(660, 0.08, 'square', 0.14); tone(990, 0.14, 'square', 0.14, null, null, ctx && ctx.currentTime + 0.07); },
    whoosh: () => noise(0.14, 0.18, 2400, 0.6),
    hit: () => { noise(0.12, 0.5, 900, 0.7); tone(160, 0.14, 'sine', 0.5, 50); },
    heavy: () => { noise(0.22, 0.6, 500, 0.6); tone(120, 0.25, 'sine', 0.6, 35); },
    block: () => { noise(0.06, 0.3, 3200, 2); tone(420, 0.05, 'triangle', 0.15); },
    special: () => tone(300, 0.3, 'sawtooth', 0.16, 1200),
    super: () => { tone(110, 0.9, 'sawtooth', 0.25, 880); noise(0.9, 0.2, 600, 0.4); },
    nova: () => { noise(0.7, 0.6, 300, 0.4); tone(80, 0.7, 'sine', 0.7, 30); },
    ko: () => { tone(500, 1.0, 'sawtooth', 0.3, 60); noise(0.5, 0.5, 400, 0.5); },
    jump: () => tone(280, 0.12, 'square', 0.07, 560),
    heal: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.16, null, null, ctx && ctx.currentTime + i * 0.07)); },
  };

  // Música: cadencia andaluza (Lam - Sol - Fa - Mi) en plan chiptune
  const ROOTS = [110, 98, 87.31, 82.41];
  const ARPS = [[0, 3, 7, 12, 7, 3, 7, 12], [0, 4, 7, 12, 7, 4, 7, 12], [0, 4, 7, 12, 7, 4, 7, 12], [0, 4, 7, 8, 7, 4, 1, 4]];
  function tick() {
    if (!ctx || muted) return;
    const bar = Math.floor(step / 8) % 4, s = step % 8, root = ROOTS[bar], t = ctx.currentTime + 0.03;
    if (s % 2 === 0) tone(root * (s === 4 ? 2 : 1), 0.16, 'triangle', 0.9, null, musicGain, t);
    tone(root * 4 * Math.pow(2, ARPS[bar][s] / 12), 0.1, 'square', 0.35, null, musicGain, t);
    if (s === 2 || s === 6) noise(0.05, 0.05, 5000, 1, t);
    if (s === 0 || s === 5) tone(140, 0.08, 'sine', 0.8, 45, musicGain, t);
    step++;
  }
  function synthMusic(bpm) {
    stopSynth(); if (!ctx) return;
    tempo = bpm || 140; step = 0;
    musicTimer = setInterval(tick, 60000 / tempo / 2);
  }
  function stopSynth() { if (musicTimer) clearInterval(musicTimer); musicTimer = null; }

  function say(text) {
    try {
      if (!window.speechSynthesis || muted) return;
      const u = new SpeechSynthesisUtterance(text); u.lang = 'es-ES'; u.rate = 1.05; u.pitch = 0.7; u.volume = 1;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* sin voz */ }
  }

  // Voces y música grabadas (assets/audio). Si un archivo falta, se usa el sonido sintetizado.
  const clips = {}; let track = null, trackKey = null;
  function voice(key) {
    if (muted || !key) return;
    let a = clips[key]; if (!a) { a = clips[key] = new Audio(V('assets/audio/' + key + '.m4a')); a.volume = 1; }
    try { a.currentTime = 0; } catch (e) { /* aún sin cargar */ }
    a.play().catch(() => {});
  }
  function music(key) {
    if (typeof key === 'number') return synthMusic(key);
    if (trackKey === key && track && !track.paused) return;
    stopMusic(); trackKey = key;
    track = new Audio(V('assets/audio/musica_' + key + '.mp3')); track.loop = true; track.volume = muted ? 0 : 0.42;
    track.onerror = () => synthMusic(140);
    track.play().catch(() => {});
  }
  function stopMusic() { stopSynth(); if (track) { track.pause(); track = null; } trackKey = null; }

  let narr = null;
  function narrate(key) { stopNarration(); narr = new Audio(V('assets/audio/' + key + '.mp3')); narr.volume = muted ? 0 : 1; narr.play().catch(() => {}); }
  function stopNarration() { if (narr) { narr.pause(); narr = null; } }

  window.Sound = {
    init, music, stopMusic, say, voice, narrate, stopNarration,
    play(name) { if (!ctx || muted) return; if (sample(name)) return; const alt = ALT[name] || name; if (alt !== name && sample(alt)) return; if (SFX[alt]) SFX[alt](); },
    isMuted() { return muted; },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; if (track) track.volume = muted ? 0 : 0.42; return muted; },
  };
})();
