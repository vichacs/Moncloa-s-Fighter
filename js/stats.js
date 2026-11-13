// Estadísticas de juego y desbloqueos.
// - Guarda siempre un resumen en este navegador (localStorage).
// - Si GAME_CONFIG.statsUrl está definido y el juego se sirve por http(s), envía además cada evento
//   al servidor (ver herramientas/servidor.js), que solo acumula contadores anónimos.
(function () {
  const CFG = window.GAME_CONFIG || {}, KEY = 'mf_stats', UKEY = 'mf_unlocked';
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  // derrotas, escenarios, remates, perfectos, duelos y contraCpu se recogen desde el 22/10/2026
  const empty = () => ({ partidas: 0, elegidos: {}, victorias: {}, ideologia: {}, ideologiaHumanos: {}, alianzas: {}, alianzasVictorias: {}, pactos: {}, derrotas: {}, escenarios: {}, remates: {}, perfectos: {}, duelos: {}, contraCpu: {} });
  const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };

  function apply(s, ev) {
    if (ev.tipo === 'eleccion') inc(s.elegidos, ev.personaje);
    // alianza: pareja líder+aliado que eligió un jugador; pacto: las ideologías de ambos
    if (ev.tipo === 'alianza') { inc(s.alianzas, ev.lider + '+' + ev.aliado); inc(s.pactos, ev.pacto); }
    if (ev.tipo === 'partida' && ev.humano && ev.alianza) inc(s.alianzasVictorias, ev.alianza);
    if (ev.tipo === 'partida') {
      s.partidas++; inc(s.victorias, ev.ganador); inc(s.ideologia, ev.ideologia);
      if (ev.humano) inc(s.ideologiaHumanos, ev.ideologia);
      if (ev.perdedor) { inc(s.derrotas, ev.perdedor); inc(s.duelos, ev.ganador + '>' + ev.perdedor); }
      if (ev.escenario) inc(s.escenarios, ev.escenario);
      if (ev.remate) inc(s.remates, ev.ganador);
      for (let i = 0; i < (ev.perfectos || 0); i++) inc(s.perfectos, ev.ganador);
      if (ev.contraCpu) inc(s.contraCpu, ev.contraCpu);
    }
    return s;
  }
  // Si el hosting falla (le pasó a IONOS el 22/10/2026: error 500 en toda la web), los eventos no se pierden:
  // se quedan en cola en este navegador y se reenvían cuando el servidor vuelve a responder.
  const PKEY = 'mf_stats_pend', GKEY = 'mf_stats_global', online = () => CFG.statsUrl && location.protocol.startsWith('http');
  const send = ev => fetch(CFG.statsUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev), keepalive: true });
  const queue = ev => { const q = read(PKEY, []); q.push(ev); write(PKEY, q.slice(-60)); };
  let flushing = false;
  async function flush() {
    if (flushing || !online()) return; flushing = true;
    try {
      let q = read(PKEY, []);
      while (q.length) {
        const r = await send(q[0]).catch(() => null);
        if (!r || r.status >= 500 || r.status === 429) break;      // sigue caído o hay que esperar: se reintenta más tarde
        q = read(PKEY, []); q.shift(); write(PKEY, q);               // aceptado (o rechazado para siempre): fuera de la cola
        await new Promise(res => setTimeout(res, 700));
      }
    } finally { flushing = false; }
  }
  function record(ev) {
    write(KEY, apply(Object.assign(empty(), read(KEY, {})), ev));
    if (!online()) return;
    try { send(ev).then(r => { if (r.status >= 500 || r.status === 429) queue(ev); else flush(); }, () => queue(ev)); } catch (e) { queue(ev); }
  }
  // Devuelve { datos, global, guardado }: las del servidor si responde (con reintentos); si no, las últimas del servidor
  // guardadas en este navegador (con su hora); y solo si nunca se han podido leer, las de este dispositivo
  async function load() {
    if (online()) {
      for (let i = 0; i < 3; i++) {
        try {
          const r = await fetch(CFG.statsUrl + (CFG.statsUrl.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
          if (r.ok) { const d = Object.assign(empty(), await r.json()); write(GKEY, { t: Date.now(), d }); flush(); return { datos: d, global: true }; }
        } catch (e) { /* sin servidor */ }
        await new Promise(res => setTimeout(res, 1200));
      }
      const g = read(GKEY, null); if (g && g.d) return { datos: Object.assign(empty(), g.d), global: true, guardado: g.t };
    }
    return { datos: Object.assign(empty(), read(KEY, {})), global: false };
  }
  setTimeout(flush, 4000); // al abrir el juego, envía lo que quedara pendiente

  // --- desbloqueos
  const hash = s => { let h = 5381; for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h; };
  const unlocked = new Set(read(UKEY, []));
  // replanteo (9/11/2026): ahora se empieza con ~20 y el resto de españoles está oculto. Quien ya había jugado antes
  // tenía a todos esos libres: se le dejan desbloqueados para que no pierda a nadie. Solo se hace una vez por navegador.
  try {
    if (!localStorage.getItem('mf_v2')) {
      const antes = ['mf_stats', 'mf_unlocked', 'mf_ultimos_rivales', 'mf_sangre', 'mf_legislatura'].some(k => localStorage.getItem(k) !== null);
      if (antes) { window.FIGHTERS.filter(f => f.oculto).forEach(f => unlocked.add(f.id)); write(UKEY, [...unlocked]); }
      localStorage.setItem('mf_v2', '1');
    }
  } catch (e) { /* sin almacenamiento */ }
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I, O, 0 ni 1 para no confundirlas al copiar
  const control = d => { const h = hash('MFP' + d) % 1024; return ABC[h >> 5] + ABC[h & 31]; };
  // personajes nuevos que aún no estén en la lista fija: detrás, por orden de FIGHTERS
  const ordenPartida = () => { const O = CFG.ordenPartida || []; return O.concat(window.FIGHTERS.filter(f => f.locked && !f.variantOf && !O.includes(f.id)).map(f => f.id)); };
  const Unlock = {
    has: f => { const b = (f.variantOf && window.FIGHTERS.find(x => x.id === f.variantOf)) || f; if (b.vetado) return false; return !b.locked || unlocked.has(b.id); }, // vetado: en gris en la selección, no se elige ni combate
    add(id) { unlocked.add(id); write(UKEY, [...unlocked]); },
    reset() { unlocked.clear(); write(UKEY, []); },
    // desbloquea el siguiente personaje bloqueado y lo devuelve (o null si no queda ninguno)
    // desbloquea el siguiente personaje bloqueado y lo devuelve (o null). Nunca los de solo código. pref: los que cumplan esto, primero
    next(pref) { const L = window.FIGHTERS.filter(x => x.locked && !x.secret && !x.soloCodigo && !x.variantOf && !unlocked.has(x.id)), f = (pref && L.find(pref)) || L[0]; if (f) Unlock.add(f.id); return f || null; },
    // contraseña: desbloquea a todos. Devuelve true si es correcta
    // Devuelve 'todos', el luchador desbloqueado (código de un solo personaje) o false
    // CÓDIGO DE PARTIDA: lo desbloqueado en este dispositivo, en un código corto para escribirlo en otro.
    // 'MF' + un bit por personaje bloqueado (orden fijo de GAME_CONFIG.ordenPartida) en base 32 + 2 letras de control.
    partida() {
      const bits = ordenPartida().map(id => unlocked.has(id) ? 1 : 0);
      while (bits.length && !bits[bits.length - 1]) bits.pop();
      if (!bits.length) return '';
      let d = ''; for (let i = 0; i < bits.length; i += 5) { let v = 0; for (let j = 0; j < 5; j++) v = v * 2 + (bits[i + j] || 0); d += ABC[v]; }
      return 'MF' + d + control(d);
    },
    // Devuelve true si el texto es un código de partida válido (y desbloquea lo que traiga)
    restaurar(txt) {
      const t = String(txt || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!/^MF[A-Z2-9]{3,}$/.test(t)) return false;
      const d = t.slice(2, -2);
      if ([...d].some(c => ABC.indexOf(c) < 0) || t.slice(-2) !== control(d)) return false;
      const orden = ordenPartida();
      [...d].forEach((c, i) => { const v = ABC.indexOf(c); for (let j = 0; j < 5; j++) if ((v >> (4 - j)) & 1) { const id = orden[i * 5 + j], f = id && window.FIGHTERS.find(x => x.id === id && x.locked); if (f) Unlock.add(f.id); } });
      return true;
    },
    code(txt) {
      if (Unlock.restaurar(txt)) return 'todos';
      const h = hash(String(txt || '').trim().toUpperCase().replace(/\s+/g, ''));
      if (h === CFG.secretHash) { window.FIGHTERS.filter(f => f.locked).forEach(f => Unlock.add(f.id)); try { localStorage.setItem('mf_lab', '1'); } catch (e) { } return 'todos'; } // además abre el LABORATORIO en este navegador // código privado: también los secretos
      if (h === CFG.testerHash) { const L = CFG.testerIds; window.FIGHTERS.filter(f => f.locked && f.secret && (!L || L.includes(f.id))).forEach(f => Unlock.add(f.id)); return 'todos'; } // recompensa de los probadores: solo algunos presidentes extranjeros (GAME_CONFIG.testerIds)
      const gr = (CFG.groupCodes || {})[h]; if (gr) { window.FIGHTERS.filter(f => f.locked && gr.ids.includes(f.id)).forEach(f => Unlock.add(f.id)); return 'todos'; } // un grupo de personajes extra
      if (h === CFG.unlockHash) { window.FIGHTERS.filter(f => f.locked && !f.secret).forEach(f => Unlock.add(f.id)); return 'todos'; } // los presidentes extranjeros solo se ganan en el reto final
      // código de la semana: solo vale desde su lunes y 8 días (se publica en redes)
      const sem = (CFG.semanales || []).find(q => q.h === h);
      if (sem) { const t = Date.now() - new Date(sem.desde + 'T00:00:00').getTime(); if (t < 0) return false; if (t > 8 * 864e5) return 'caducado'; const g = window.FIGHTERS.find(x => x.id === sem.id); if (g) { Unlock.add(g.id); return g; } }
      const id = (CFG.unlockCodes || {})[h], f = id && window.FIGHTERS.find(x => x.id === id);
      if (f) { Unlock.add(f.id); return f; }
      return false;
    },
    pending: () => window.FIGHTERS.filter(f => f.locked && !f.secret && !unlocked.has(f.id)).length,
  };
  window.Stats = { record, load }; window.Unlock = Unlock;
})();
