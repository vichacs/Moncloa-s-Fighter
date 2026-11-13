// MONCLOA'S FIGHTER - motor del juego (canvas 2D, sin dependencias)
(() => {
  'use strict';
  // versión de los recursos: la misma ?v= del script; así cada actualización obliga al navegador a descargar las imágenes y sonidos nuevos
  const AV = ((document.currentScript || {}).src || '').split('v=')[1] || '', V = u => AV ? u + (u.includes('?') ? '&' : '?') + 'v=' + AV : u;
  const W = 1280, H = 720, GROUND = 655, STAGE_W = 1698, GRAV = 1.5, VMAX = 1920; // VMAX: ancho máximo visible (pantallas 21:9 y más); lo que pase del escenario se rellena en espejo
  // ritmo del juego: MOVE multiplica la velocidad de andar de las fichas, JUMP es el impulso del salto (con GRAV) y DASH la carrera
  const MOVE = 1.6, JUMP = -24.5, DASH = 2.5;
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  // pantalla ancha de verdad: la lógica sigue en 1280x720 (el online no cambia); el lienzo se ensancha hasta la proporción de la pantalla
  // (máx. el ancho del escenario, 1698) y todo se dibuja desplazado OX. Los márgenes los llena el escenario o un fondo difuminado
  let VW = W, OX = 0, TMIN = 0; // TMIN: tamaño mínimo de letra de píxel para que en pantallas pequeñas (móvil) se lea a ~8,5 px reales
  const tam = z => z < R_MIN && z < TMIN ? Math.min(TMIN, Math.round(z * 1.7)) : z; const ambC = document.createElement('canvas'); ambC.width = 64; ambC.height = 36; const ambX = ambC.getContext('2d'); let ambOk = false;
  function ajustaAncho() {
    const vv = window.visualViewport, w = vv ? vv.width : innerWidth, h = vv ? vv.height : innerHeight;
    const nv = Math.max(W, Math.min(VMAX, Math.round(H * w / h / 2) * 2)); TMIN = Math.min(15, Math.round(8.5 * H / Math.max(1, h)));
    if (nv !== VW || canvas.width !== nv) { VW = nv; OX = (VW - W) / 2; canvas.width = VW; canvas.height = H; ambOk = false; document.documentElement.style.setProperty('--ar', String(VW / H)); }
  }
  ajustaAncho(); addEventListener('resize', ajustaAncho); if (window.visualViewport) visualViewport.addEventListener('resize', ajustaAncho);
  const camVis = c => !OX ? c : W + 2 * OX >= STAGE_W ? (STAGE_W - W) / 2 : clamp(c, OX, STAGE_W - W - OX); // la cámara que se pinta: en los bordes del escenario se para para no dejar huecos
  { const di = ctx.drawImage.bind(ctx); ctx.drawImage = (im, ...r) => { if (!im || (im instanceof HTMLImageElement && (!im.complete || !im.naturalWidth))) return; di(im, ...r); }; } // una imagen que falta o aún carga se salta: nunca congela la partida
  const META = window.SPRITE_META, FIGHTERS = window.FIGHTERS.filter(f => META[f.id]), STAGES = window.STAGES;
  const BASE_POSES = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'cach1', 'cach2', 'cach3', 'cach4', 'cach5', 'cach6', 'cach7', 'cach8', 'idle', 'walk', 'crouch', 'jump', 'block', 'hit', 'ko', 'win', 'punch', 'kick', 'low', 'air', 'sp1', 'sp2', 'super',
    'w1', 'w2', 'w3', 'w4', 'idle2', 'punch0', 'kick0', 'hit2', 'pm', 'pr', 'km', 'kr', 'low0', 'jumpup', 'fall', 'getup',
    'sp2a', 'sp2b', 'sp2c', 'sp2d', 'sp1w', 'superc', 'super2', 'win2', 'sp2crash',
    'air0', 'airr', 'airp', 'crouch0', 'low1', 'block0', 'land', 'w5', 'w6', 'w7', 'w8',
    'ib1', 'ib2', 'ib3', 'ib4', 'ht1', 'ht2', 'ht3', 'ht4', 'jp1', 'jp2', 'jp3', 'jp4', 'th1', 'th2', 'th3', 'th4',
    'fa1', 'fa2', 'fa3', 'fa4', 'fa5', 'fa6', 'fa7', 'fa8', 'gal1', 'gal2', 'gal3', 'gal4', 'gal5', 'gal6', 'gal7', 'gal8',
    'sv1', 'sv2', 'sv3', 'sv4', 'sv5', 'sv6', 'sv7', 'sv8', 'sv9', 'sv10', 'sv11', 'sv12'];
  // cada pose puede tener versión magullada (sufijo _x)
  const CARGA_CON_OBJETO = new Set(['echenique', 'carmena', 'abascal', 'puente', 'barcenas', 'aguirre', 'marlaska', 'montero', 'belarra', 'colau', 'rufian', 'gamarra', 'barbera', 'monica', 'illa', 'revilla', 'bolanos', 'tellado', 'cayetana']);
  // motor de guiones (DISENO.md, 3 bis): hojas s (súper), z (INCONSTITUCIONALITY) e y (INDULTALITY): g = luchador, o = objeto
  const GUION_POSES = ['s', 'z', 'y'].flatMap(h => [1, 2, 3, 4].flatMap(i => ['g' + h + i, 'o' + h + i]));
  const GUION = id => (CFG.guiones !== false && (window.GUIONES || {})[id]) || null;
  // súper de agarre al estilo Mortal Kombat (DISENO.md): 8 fotogramas propios del luchador, k1..k8, sin objetos que aparecen
  const KOMBO_POSES = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7', 'y8']; // u: INDULTALITY propia; b: pulsar el botón rojo (b1-b4 con la mano, b5-b7 de un salto, b8 mirando al cielo) // q: remate (INCONSTITUCIONALITY) propio; d: kit de desmembrar de cada luchador (hoja <id>_gore)
  const POSES = BASE_POSES.concat(BASE_POSES.map(p => p + '_x'), ['proj', 'face'], GUION_POSES, KOMBO_POSES);
  const FONT = '"Press Start 2P", "Arial Black", Impact, sans-serif';
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const byId = id => FIGHTERS.find(f => f.id === id);
  // modos: un luchador con «variantOf» es otra versión de otro (Pablo con/sin coleta, Ábalos preso...). En la rejilla solo sale el
  // original y al elegirlo se cambia de modo con PATADA (o tocando su retrato grande)
  const BASEF = f => (f.variantOf && byId(f.variantOf)) || f;
  const LISTO = f => !f.secret || !!(META[f.id] && META[f.id].punch); // un presidente extranjero sin todas sus hojas aún no puede luchar
  // lo nacional y lo internacional van separados: el arcade y sus modos son solo de España; la CUMBRE solo de extranjeros;
  // en versus, online y entrenamiento se cambia de pestaña (Q o tocando la pestaña) si ya tienes algún extranjero
  const bandoDe = () => S.mode === 'cumbre' ? 'mundo' : ['versus', 'online', 'training', 'libre', 'conflictos'].includes(S.mode) ? (S.bando || 'es') : 'es';
  const GRID = () => { const b = bandoDe(); return FIGHTERS.filter(f => !f.variantOf && (b === 'mundo' ? f.secret && Unlock.has(f) && LISTO(f) : !f.secret)); }; // los presidentes extranjeros solo aparecen cuando los ganas
  const VARS = f => [f, ...FIGHTERS.filter(v => v.variantOf === f.id)];
  const grisCache = {}; // versión en blanco y negro de una imagen (funciona también donde el navegador no tiene ctx.filter)
  const gris = (key, im) => { if (grisCache[key]) return grisCache[key]; if (!im || !im.complete || !im.naturalWidth) return im; const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), a = d.data; for (let i = 0; i < a.length; i += 4) { const v = a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11; a[i] = a[i + 1] = a[i + 2] = v; } x.putImageData(d, 0, 0); return (grisCache[key] = c); };
  const shownName = id => { const f = byId(id); return !f ? id : Unlock.has(f) || f.vetado ? f.name : '???'; }; // los personajes ocultos no enseñan el nombre hasta desbloquearlos
  const CFG = window.GAME_CONFIG || {};
  // sangre: 'si' | 'no' | 'ketchup'. Es preferencia de cada jugador y solo cambia el dibujo (la simulación es la misma: en online no se desincroniza)
  let SANGRE = 'si'; try { SANGRE = localStorage.getItem('mf_sangre') || 'si'; } catch (e) { }
  const SANGRE_TXT = { si: 'SÍ', no: 'NO', ketchup: 'KÉTCHUP' };
  const sangreVer = () => CFG.sangre !== false && SANGRE !== 'no';
  // desmembramientos (partidos por la mitad, cabezas y brazos arrancados): solo en la web. En la app de Google Play (TWA: Chrome la abre
  // con referrer android-app://, o con ?app=1) se cambian por golpes y caídas. sessionStorage y no localStorage: el almacenamiento de la
  // app es el mismo que el del Chrome del móvil, y la web abierta en el navegador no debe quedarse en modo suave
  const ES_APP = (() => { let a = /^android-app:\/\//.test(document.referrer || '') || /[?&]app=1\b/.test(location.search); try { if (a) sessionStorage.setItem('mf_app', '1'); a = a || sessionStorage.getItem('mf_app') === '1'; } catch (e) { } return a; })();
  // y aun en la web, solo si el jugador lo activa en la pausa (FATALITY +18), con aviso de parodia. Por defecto, remates sin desmembrar
  // 2026-11-08: juegan muchos menores, así que NADIE se desmiembra en ningún sitio (ni web ni app, ni con opción). Se queda la función
  // para no reescribir los remates: con false todos van por su versión sin desmembrar (lanzar, llave, golpe contra la rodilla)
  const goreFuerte = () => false;

  // ---------- Carga de imágenes ----------
  const IMG = {}; let toLoad = 0, loaded = 0;
  function load(key, src) {
    const im = new Image(); toLoad++;
    im.onload = () => loaded++; im.onerror = () => { loaded++; console.warn('No se pudo cargar', src); };
    im.src = src; IMG[key] = im;
  }
  // al arrancar solo se cargan cara, pose de guardia y de victoria de cada luchador (menús y selección);
  // el resto de sus poses se piden con ensure() cuando va a salir en pantalla, para que la web abra rápido
  FIGHTERS.forEach(f => ['face', 'idle', 'win'].forEach(p => load(f.id + '/' + p, V(`assets/chars/${f.id}/${p}.webp`))));
  function ensure(ids) {
    const out = [];
    for (const id of ids) {
      if (!id || !META[id]) continue;
      const add = (key, src) => { if (!IMG[key]) { const im = new Image(); im.onerror = () => { if (!im.reint) { im.reint = 1; setTimeout(() => { im.src = src + (src.includes('?') ? '&' : '?') + 'r=1'; }, 1200); } }; im.src = src; IMG[key] = im; } out.push(IMG[key]); }; // con mala conexión un dibujo puede fallar: se pide otra vez
      POSES.forEach(p => { if (p === 'face' || META[id][p]) add(id + '/' + p, V(`assets/chars/${id}/${p}.webp`)); });
      add(id + '/cutin', V(`assets/chars/${id}/cutin.webp`)); if (META[id].idle_x) add(id + '/face_x', V(`assets/chars/${id}/face_x.webp`));
      const fd = FIGHTERS.find(f => f.id === id); if (fd && fd.fatal && fd.fatal.type === 'aplasta') add(id + '/crush', V(`assets/chars/${id}/crush.webp`)); // objeto gigante del remate, dibujado a su tamaño
    }
    return out;
  }
  function ensureStage(id) {
    const nv = (window.STAGE_VIDEO || {})[id];
    if (nv) return Array.from({ length: nv }, (_, i) => { const key = `stage/${id}_v${i + 1}`; if (!IMG[key]) { const im = new Image(); im.src = V(`assets/stages/${id}_v${String(i + 1).padStart(2, '0')}.webp`); IMG[key] = im; } return IMG[key]; });
    if (!STAGE_LAYERS.includes(id)) return [];
    return ['b', 'c'].map(k => { const key = 'stage/' + id + '_' + k; if (!IMG[key]) { const im = new Image(); im.src = V(`assets/stages/${id}_${k}.webp`); IMG[key] = im; } return IMG[key]; });
  }
  const allLoaded = list => list.every(im => im.complete);
  // Antes de cada combate se sueltan los dibujos de los luchadores y escenarios que no salen en él: la caché IMG crecía
  // ~50 MB descomprimidos por combate y en móviles con poca memoria la pestaña se cerraba sola hacia el segundo combate.
  // Se quedan cara, guardia y victoria (menús), el fondo fijo de cada escenario y todo lo de interfaz; si vuelven a salir, ensure() los pide otra vez.
  const FIJAS = new Set(['face', 'idle', 'win']);
  function libera(ids, stage) {
    const keep = new Set(ids.filter(Boolean)), sueltos = [];
    for (const k of Object.keys(IMG)) {
      const i = k.indexOf('/'), dueño = k.slice(0, i), resto = k.slice(i + 1); let fuera = false;
      if (dueño === 'stage') { const m = resto.match(/^(.+?)_(v\d+|noche_.+|[bc])$/); fuera = !!m && m[1] !== stage; }
      else if (META[dueño]) fuera = !keep.has(dueño) && !FIJAS.has(resto);
      if (fuera) { sueltos.push(IMG[k]); delete IMG[k]; }
    }
    for (const im of sueltos) { im.onload = im.onerror = null; im.removeAttribute('src'); } // sin src el navegador puede soltar el mapa de bits ya
    tinteCache.clear(); // lienzos teñidos (noche, golpes) de todos: se rehacen solos al pintarse
    return sueltos.length;
  }
  STAGES.forEach(s => load('stage/' + s.id, V(`assets/stages/${s.id}.png`)));
  load('ui/mapa', V('assets/ui/mapa.jpg')); load('ui/mapa_espana', V('assets/ui/mapa_espana.jpg'));
  for (let i = 1; i <= 4; i++) { load('ui/intro' + i, V(`assets/ui/intro${i}.png`)); for (const k of 'bc') { const im = new Image(); im.src = V(`assets/ui/intro${i}_${k}.png`); IMG['ui/intro' + i + k] = im; } } // capas de animación: opcionales, no bloquean la carga
  // titulares de combate: hojas de fotogramas hechas con la plantilla 8-bit Arcade Titles (herramientas/titulos_arcade.py); si no han cargado, sale el texto de siempre
  const TIT = window.TITULOS || {}; Object.keys(TIT).forEach(k => { const im = new Image(); im.src = V(`assets/ui/tit_${k}.webp`); IMG['tit/' + k] = im; });
  const TIT_DE = { 'ASALTO 1': 'asalto1', 'ASALTO 2': 'asalto2', 'ASALTO 3': 'asalto3', 'ASALTO DE DESEMPATE': 'desempate', 'ASALTO FINAL': 'asaltofinal', '¡A PELEAR!': 'pelear', 'K.O.': 'ko', 'DOBLE K.O.': 'doble', 'TIEMPO': 'tiempo', '¡MAYORÍA ABSOLUTA!': 'mayoria', '¡REMÁTALO!': 'rematalo' };
  function titular(banner, bt) { const k = TIT_DE[banner], m = TIT[k], im = IMG['tit/' + k]; if (!m || !im || !im.complete || !im.naturalWidth) return false; const i = Math.min(m.n - 1, bt), q = 2, dw = m.w * q, dh = m.h * q, was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(im, (i % m.cols) * m.w, Math.floor(i / m.cols) * m.h, m.w, m.h, Math.round(W / 2 - dw / 2), Math.round(280 - dh / 2), dw, dh); ctx.imageSmoothingEnabled = was; return true; }
  load('ui/logo', V('assets/ui/logo.png')); ['historia', 'diario', 'solo', 'multi', 'extras', 'online'].forEach(k => load('menu/' + k, V('assets/ui/menu_' + k + '.png'))); load('ui/escandalo_foto', V('assets/ui/escandalo_foto.png')); ['pegada', 'blindaje', 'aforado', 'superavit', 'apoyo', 'velocidad', 'dietas', 'confianza', 'boton', 'escandalo', 'legislatura', 'mocion', 'cumbre', 'caos', 'lab', 'firma'].forEach(k => load('carta/' + k, V('assets/ui/cartas/' + k + '.png'))); // ilustraciones de cartas (Magnific) load('ui/portada', V('assets/ui/portada.png?v=4'));
  const PROPS = Object.assign({}, window.PROP_META || {}, window.PROP_EXTRA || {}); // PROP_EXTRA: objetos añadidos después (herramientas/props_nuevos.py)
  // tamaño real de cada objeto respecto a un luchador (~425 px = 1,75 m): alto en píxeles; el ancho sigue la proporción del dibujo
  const PROP_NOMBRE = { micro: 'Micrófono', cono: 'Cono', papelera: 'Papelera', silla: 'Silla', maletin: 'Maletín', valla: 'Valla', maceta: 'Maceta', carpetas: 'Carpetas', giratoria: 'Puerta giratoria', microabierto: 'Micro abierto' };
  const PROP_H = { micro: 160, cono: 170, papelera: 230, silla: 215, maletin: 110, valla: 265, maceta: 190, carpetas: 90, giratoria: 300, microabierto: 170 };
  for (const n in PROPS) { const m = PROPS[n], k = (PROP_H[n] || m.h) / m.h; m.w = Math.round(m.w * k); m.h = Math.round(m.h * k); }
  Object.keys(PROPS).forEach(n => load('prop/' + n, V(`assets/props/${n}.webp`)));
  for (let i = 0; i < 8; i++) load('vfx/hit' + i, V(`assets/vfx/hit${i}.jpg`));
  for (let i = 0; i < 4; i++) { load('vfx/boom' + i, V(`assets/vfx/boom${i}.jpg`)); load('vfx/aura' + i, V(`assets/vfx/aura${i}.jpg`)); }
  // efectos de packs gratuitos (pixel art, con transparencia): tiras horizontales [fotogramas, ancho, alto]
  const STRIPS = { px_boom: [15, 96, 96], px_elec: [13, 96, 96], px_pilar: [8, 55, 123], px_disparo: [3, 247, 107] };
  load('vfx/falcon', V('assets/vfx/falcon.webp')); load('vfx/tractor', V('assets/vfx/tractor.webp')); load('vfx/falcon_big', V('assets/vfx/falcon_big.png')); load('vfx/falcon_crash', V('assets/vfx/falcon_crash.png')); for (let i = 1; i <= 8; i++) { load('vfx/medicos' + i, V('assets/vfx/medicos' + i + '.png')); load('vfx/robots' + i, V('assets/vfx/robots' + i + '.png')); }
  ['f1', 'f4', 'g0', 'g1', 'g2', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10'].forEach(n => load('vfx/paloma_' + n, V(`assets/vfx/paloma_${n}.png`)));
  Object.keys(STRIPS).forEach(n => load('vfx/' + n, V(`assets/vfx/${n}.png`)));
  // RENDIMIENTO: copia de una imagen con un filtro (hue-rotate, brightness) ya aplicado, hecha una sola vez.
  // ctx.filter en cada fotograma es lo más caro del dibujo (sobre todo en móviles): así se ve igual y cuesta como una imagen normal
  // RENDIMIENTO: en Chrome, pintar un lienzo (canvas) sobre el del juego cuesta unas 25 veces más que pintar una imagen <img>
  // (medido: 30 letras-lienzo 7,6 ms; las mismas como imagen 0,3 ms). Un lienzo que ya no va a cambiar se pasa a imagen PNG
  // en segundo plano (fija) y, cuando está lista, se pinta esa (vista); mientras tanto, el lienzo. Píxel a píxel es lo mismo.
  const fija = c => { if (!c || c.__img !== undefined || !c.toBlob) return; c.__img = null; try { c.toBlob(b => { if (!b) return; const u = URL.createObjectURL(b), im = new Image(); im.onload = () => { c.__img = im; URL.revokeObjectURL(u); }; im.onerror = () => URL.revokeObjectURL(u); im.src = u; }); } catch (e) { /* sin toBlob: se queda el lienzo */ } };
  const vista = c => (c && c.__img) || c;
  const VEL_EXT = new Map(), LINEAS_VEL = !(window.GAME_CONFIG && GAME_CONFIG.lineasVelocidad === false); // bordes de silueta por pose para las líneas de velocidad
  const tinteCache = new Map(); let NOCHE = false; const FNOCHE = 'brightness(0.7) saturate(0.6)'; // + capa azul sobre la silueta (ver tinte) // tono de los luchadores durante el apagón
  function tinte(im, key, filtro) {
    let c = tinteCache.get(key); if (c) return vista(c);
    if (!im || !(im.naturalWidth || im.width)) return im;
    if (tinteCache.size > 160) tinteCache.clear();
    c = document.createElement('canvas'); c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height;
    const x = c.getContext('2d'); x.filter = filtro; x.drawImage(im, 0, 0); if (filtro === FNOCHE) { x.filter = 'none'; x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(28,46,120,0.34)'; x.fillRect(0, 0, c.width, c.height); } tinteCache.set(key, c); fija(c); return c;
  }
  function strip(name, frame, x, y, w, h, flip, hue) {
    const im = IMG['vfx/' + name], [n, fw, fh] = STRIPS[name]; if (!im || !im.complete || !im.naturalWidth) return;
    const src = hue != null ? tinte(im, 'strip/' + name + '|' + Math.round(hue), `hue-rotate(${Math.round(hue)}deg)`) : im;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.drawImage(src, Math.min(n - 1, Math.max(0, frame | 0)) * fw, 0, fw, fh, -w / 2, -h / 2, w, h); ctx.restore();
  }
  // ---------- RESTOS: los objetos se rompen al estrellarse (trozos del propio dibujo + material) y los papeles caen dando vueltas ----------
  // Todo en el suelo del combate (M.restos): 'trozo' = cacho del dibujo del objeto, 'bit' = cuadradito de material, 'folio' = papel animado.
  const MATERIAL = {
    maceta: { c: ['#6b4a2b', '#8a5e36', '#4e3420', '#8a5e36'], extra: ['#d8202a', '#ff4a4a', '#2f8a3a'], folios: 0, n: 22 },
    valla: { c: ['#c9ced6', '#8a9099', '#5b6068', '#e0b020'], folios: 0, n: 14 }, cono: { c: ['#ff7a1a', '#ffffff', '#c94f0c'], folios: 0, n: 12 },
    papelera: { c: ['#2f8a4a', '#1d5e31', '#9aa0a8'], folios: 5, n: 10 }, carpetas: { c: ['#d9c79a', '#b89e66'], folios: 12, n: 6 },
    maletin: { c: ['#7a4a22', '#5a3416', '#e0b020'], folios: 7, n: 10 }, silla: { c: ['#7a3b1e', '#4e2412', '#b0122a'], folios: 0, n: 16 }, micro: { c: ['#3a3a44', '#9aa0a8', '#ffe14a'], folios: 0, n: 10 },
    giratoria: { c: ['#c9a227', '#9fd8ef', '#e8f6ff', '#7a5c14'], folios: 0, n: 24 }, microabierto: { c: ['#26262e', '#9aa0a8', '#ff2a2a'], folios: 0, n: 10 },
  };
  // hojas dibujadas de cada objeto rompiéndose (herramientas/roturas.py): 6 fotogramas, el último son los restos en el suelo; folio: 8 de un papel dando vueltas
  const ROT = window.ROTURA_META || {}; Object.keys(ROT).forEach(n => { for (let i = 1; i <= ROT[n].n; i++) load('rot/' + n + i, V(`assets/props/rotura/${n}_${i}.webp`)); });
  const rotLista = n => { const m = ROT[n], im = m && IMG['rot/' + n + m.n]; return !!(m && im && im.complete && im.naturalWidth); };
  function folios(M, x, y, n, vx) { const R = M.restos = M.restos || []; for (let i = 0; i < n; i++) R.push({ k: 'folio', x: x + rand(-40, 40), y: y + rand(-30, 30), vx: (vx || 0) * 0.4 + rand(-6, 6), vy: rand(-12, -4), t: 0, f: Math.floor(rand(0, 4)), g: GROUND + rand(-4, 22), tono: Math.random() < 0.25 }); }
  // trizas de papel (estilo tebeo de los 90): estallan en abanico, frenan en el aire, caen revoloteando y se esfuman al poco de tocar el suelo
  function trizas(M, x, y, n, vx) { const R = M.restos = M.restos || []; for (let i = 0; i < n; i++) { const an = rand(-Math.PI * 0.95, -Math.PI * 0.05), v = rand(7, 19);
    R.push({ k: 'triza', x: x + rand(-20, 20), y: y + rand(-20, 20), vx: Math.cos(an) * v + (vx || 0) * 0.35, vy: Math.sin(an) * v, t: 0, f: Math.floor(rand(0, 8)), sw: rand(0.07, 0.13), am: rand(1.6, 3.2), q: rand(0.7, 1.15), esp: Math.random() < 0.5, g: GROUND + rand(-2, 24) }); } }
  function romper(M, n, x, y, vx) { // el objeto se hace pedazos donde está
    const m = PROPS[n], im = IMG['prop/' + n], mat = MATERIAL[n] || { c: ['#888', '#555'], folios: 0, n: 10 }; if (!m) return;
    if (rotLista(n)) { // secuencia propia dibujada: se rompe donde está y cae hasta el suelo
      const R = M.restos = M.restos || []; R.push({ k: 'rot', n, x, by: Math.min(GROUND, y + m.h / 2), vy: -4, vx: (vx || 0) * 0.12, dir: (vx || 1) < 0 ? -1 : 1, g: GROUND + rand(2, 16), t: 0 });
      if (mat.folios) { folios(M, x, y, Math.ceil(mat.folios / 2), vx); trizas(M, x, y, mat.folios * 2, vx); }
      M.spark(x, y, '#ffffff', 10); M.shake = Math.max(M.shake, 8); Sound.play('heavy'); if (R.length > 420) R.splice(0, R.length - 420); return;
    }
    const R = M.restos = M.restos || [], cols = m.w > m.h * 1.3 ? 3 : 2, rows = m.h > m.w * 1.3 ? 3 : 2, d = Math.sign(vx || 0);
    if (im && im.complete && im.naturalWidth) for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) R.push({ k: 'trozo', n, i, j, cols, rows, w: m.w / cols, h: m.h / rows, x: x + (i - (cols - 1) / 2) * m.w / cols, y: y + (j - (rows - 1) / 2) * m.h / rows, vx: d * rand(1, 6) + (i - (cols - 1) / 2) * rand(2, 5), vy: rand(-15, -6), rot: 0, vr: rand(-0.35, 0.35), g: GROUND + rand(6, 30) - Math.min(m.w / cols, m.h / rows) * 0.45, t: 0 }); // reposa en el suelo, no por debajo
    for (let i = 0; i < mat.n; i++) { const ex = mat.extra && Math.random() < 0.3; R.push({ k: 'bit', c: ex ? mat.extra[Math.floor(rand(0, mat.extra.length))] : mat.c[Math.floor(rand(0, mat.c.length))], s: Math.random() < 0.3 ? 8 : 4, x: x + rand(-m.w / 3, m.w / 3), y: y + rand(-m.h / 3, m.h / 3), vx: d * rand(0, 5) + rand(-7, 7), vy: rand(-16, -4), g: GROUND + rand(0, 40), t: 0 }); }
    if (mat.folios) { folios(M, x, y, Math.ceil(mat.folios / 2), vx); trizas(M, x, y, mat.folios * 2, vx); }
    M.spark(x, y, '#ffffff', 10); M.shake = Math.max(M.shake, 8); Sound.play('heavy');
    if (R.length > 420) R.splice(0, R.length - 420);
  }
  const RESTO_VIDA = 300, RESTO_FUNDE = 120; // ~5 s en total: los últimos 2 s se van fundiendo
  const restoAlfa = r => r.t > RESTO_VIDA - RESTO_FUNDE ? Math.max(0, (RESTO_VIDA - r.t) / RESTO_FUNDE) : 1;
  function restosPaso(M) {
    const R = M.restos; if (!R || !R.length) return;
    for (const r of R) {
      r.t++;
      if (r.k === 'folio') { if (!r.st) { r.vy = Math.min(r.vy + 0.35, 2.2); r.vx *= 0.96; r.x += r.vx + Math.sin((r.t + r.f * 13) * 0.11) * 1.8; r.y += r.vy; if (r.y >= r.g) { r.y = r.g; r.st = true; r.t = Math.max(r.t, 60); } } continue; }
      if (r.k === 'triza') { if (!r.st) { const lento = Math.hypot(r.vx, r.vy) < 3;
          r.vx *= 0.9; r.vy = r.vy * 0.9 + (lento ? 0.16 : 0.35); if (lento) r.vy = Math.min(r.vy, 1.5); // tras el estallido, planea
          r.x += r.vx + (lento ? Math.sin(r.t * r.sw + r.f) * r.am : 0); r.y += r.vy; r.fr = (r.fr || 0) + (lento ? 0.22 : 0.6); // gira deprisa al salir y más despacio al planear
          if (r.y >= r.g) { r.y = r.g; r.st = r.t; } } continue; }
      if (r.k === 'rot') { if (!r.st) { r.vy += 0.9; r.by += r.vy; r.x += r.vx; if (r.by >= r.g) { r.by = r.g; r.st = true; } } continue; }
      if (r.st) continue; r.vy += 1; r.x += r.vx; r.y += r.vy; if (r.rot != null) r.rot += r.vr;
      if (r.y >= r.g && r.vy > 0) { r.y = r.g; if (r.vy > 5) { r.vy *= -0.3; r.vx *= 0.55; if (r.vr) r.vr *= 0.5; } else { r.st = true; r.vx = 0; r.vy = 0; r.t = Math.max(r.t, 40); if (r.rot != null) r.rot = Math.round(r.rot / 1.5708) * 1.5708 * 0.15 + r.rot * 0.85; } }
    }
    M.restos = R.filter(r => r.k === 'triza' ? !(r.st && r.t - r.st > 70) && r.t < 400 : r.t < RESTO_VIDA); // los restos se van desvaneciendo poco a poco (Gastón, 12-nov)
  }
  // folio de píxel en 4 fotogramas: de frente, girando, de canto y por detrás (más oscuro)
  function pintaFolio(x, y, fr, dorso) {
    const W4 = [16, 10, 4, 10][fr], X = Math.round(x / 4) * 4 - W4 / 2, Y = Math.round(y / 4) * 4, atras = fr === 3;
    ctx.fillStyle = '#2a2638'; ctx.fillRect(X - 2, Y - 2, W4 + 4, 24);
    ctx.fillStyle = atras ? '#cfc8b4' : dorso ? '#fff6d6' : '#f4f1e4'; ctx.fillRect(X, Y, W4, 20);
    if (W4 > 4 && !atras) { ctx.fillStyle = '#9aa0b8'; ctx.fillRect(X + 2, Y + 4, W4 - 4, 2); ctx.fillRect(X + 2, Y + 9, W4 - 4, 2); ctx.fillRect(X + 2, Y + 14, Math.max(2, W4 - 8), 2); }
    if (W4 === 16 && !atras && dorso) { ctx.fillStyle = '#d0111f'; ctx.fillRect(X + 10, Y + 14, 4, 4); } // alguno lleva sello
  }
  // triza de píxel (si no está la hoja dibujada): papel roto con el borde a dientes y tinta, en 4 fotogramas de giro
  function pintaTriza(x, y, fr, esp) {
    const w = [14, 9, 3, 9][fr], X = Math.round(x / 3) * 3 - Math.round(w / 2), Y = Math.round(y / 3) * 3, d = esp ? 1 : 0;
    ctx.fillStyle = '#141018'; ctx.fillRect(X - 3, Y - 3, w + 6, 15); ctx.fillStyle = fr === 3 ? '#d8d2c0' : '#fbf8ee'; ctx.fillRect(X, Y, w, 9);
    if (w > 3) { ctx.fillStyle = '#141018'; ctx.fillRect(X + (d ? w - 3 : 0), Y - 3, 3, 3); ctx.fillRect(X + (d ? 0 : w - 3), Y + 9, 3, 3); if (fr !== 3) ctx.fillRect(X + 3, Y + 3, Math.max(3, w - 6), 3); }
  }
  function pintaRestos(M, cam, enAire) {
    const R = M.restos; if (!R || !R.length) return;
    for (const r of R) {
      if (r.k === 'rot') { // fotogramas 1-5 al romperse (el 5 aguanta hasta tocar suelo); el 6, los restos tirados
        const m = ROT[r.n], fi = Math.min(5, 1 + Math.floor(r.t / 5)), f = r.st && r.t >= 25 ? m.n : fi, im = IMG['rot/' + r.n + f]; if ((f === m.n) === enAire) continue; if (!im || !im.naturalWidth) continue;
        ctx.globalAlpha = restoAlfa(r); ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(r.x - cam), Math.round(r.by)); if (r.dir < 0) ctx.scale(-1, 1);
        ctx.drawImage(NOCHE ? tinte(im, 'rot/' + r.n + f + '|noche', FNOCHE) : im, -m.ax, -m.ay, m.w, m.h); ctx.restore(); continue;
      }
      if (r.k === 'triza') { if (!!r.st === enAire) continue; // en el suelo aguanta un momento y se esfuma
        ctx.globalAlpha = r.st ? Math.max(0, 1 - (r.t - r.st - 35) / 35) : 1; const TM = ROT.trizas, fr = r.st ? 0 : Math.floor(r.fr + r.f) % 8;
        const im = TM && IMG['rot/trizas' + (1 + fr % TM.n)];
        if (im && im.naturalWidth) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(r.x - cam), Math.round(r.y)); if (r.esp) ctx.scale(-1, 1); ctx.drawImage(im, -TM.w * r.q / 2, -TM.h * r.q / 2, TM.w * r.q, TM.h * r.q); ctx.restore(); }
        else pintaTriza(r.x - cam, r.y, fr % 4, r.esp);
        continue; }
      if (!!r.st === enAire) continue; ctx.globalAlpha = restoAlfa(r);
      if (r.k === 'folio') { const FM = ROT.folio, fs = FM && IMG['rot/folio' + (r.st ? 1 : 1 + Math.floor(r.t / 4 + r.f * 2) % FM.n)];
        if (fs && fs.naturalWidth) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(r.x - cam), Math.round(r.y)); if (r.f % 2) ctx.scale(-1, 1); ctx.drawImage(fs, -FM.w / 2, -FM.h / 2, FM.w, FM.h); ctx.restore(); }
        else pintaFolio(r.x - cam, r.y, r.st ? 0 : Math.floor(r.t / 5 + r.f) % 4, r.tono); }
      else if (r.k === 'bit') { ctx.fillStyle = r.c; ctx.fillRect(Math.round((r.x - cam) / 4) * 4, Math.round(r.y / 4) * 4, r.s, r.st ? Math.max(4, r.s / 2) : r.s); }
      else { const im = IMG['prop/' + r.n]; if (!im || !im.naturalWidth) continue; const sw = im.naturalWidth / r.cols, sh = im.naturalHeight / r.rows; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(r.x - cam), Math.round(r.y)); ctx.rotate(r.rot); ctx.drawImage(NOCHE ? tinte(im, 'prop/' + r.n + '|noche', FNOCHE) : im, r.i * sw, r.j * sh, sw, sh, -r.w / 2, -r.h / 2, r.w, r.h); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
  }
  // objetos del suelo que se pueden recoger y lanzar (abajo + puño) en cada escenario: [objeto, posición x]
  const STAGE_PROPS = {
    mountvernon: [['maceta', 500], ['valla', 1210]], venice: [['cono', 500], ['papelera', 1210]],
    washington: [['maletin', 500], ['cono', 1210]], habana: [['maceta', 500], ['papelera', 1210]], chicago: [['valla', 500], ['cono', 1210]], alo: [['silla', 500], ['maceta', 1210]], congresoar: [['valla', 500], ['papelera', 1210]], riogallegos: [['cono', 500], ['papelera', 1210]], laboca: [['papelera', 500], ['cono', 1210]], olivos: [['maceta', 500], ['silla', 1210]], buenosaires: [['valla', 500], ['papelera', 1210]], caracas: [['maceta', 500], ['papelera', 1210]], paris: [['silla', 500], ['maceta', 1210]], roma: [['maceta', 500], ['cono', 1210]], moscu: [['valla', 500], ['maletin', 1210]], pekin: [['maceta', 500], ['carpetas', 1210]], pyongyang: [['micro', 500], ['valla', 1210]], montevideo: [['maceta', 500], ['silla', 1210]], jerusalen: [['carpetas', 500], ['micro', 1210]],
    canarias: [['maceta', 500], ['papelera', 1210]], ceuta: [['maletin', 500], ['cono', 1210]], melilla: [['valla', 500], ['maceta', 1210]],
    congreso: [['micro', 500], ['maletin', 860], ['valla', 1200]], sol: [['cono', 480], ['papelera', 1220]],
    ayuntamiento: [['maceta', 540], ['cono', 1170]], cibeles: [['valla', 470], ['cono', 1230]],
    parlament: [['valla', 480], ['maceta', 1220]], soto: [['valla', 470], ['papelera', 1230]], marbella: [['maceta', 470], ['maceta', 1230]], cumbre: [['maceta', 470], ['maceta', 1230]], sevilla: [['maceta', 500], ['papelera', 1210]], hacienda: [['carpetas', 520], ['maletin', 1180]], santander: [['cono', 470], ['papelera', 1230]], supremo: [['valla', 470], ['maceta', 1230]], exteriores: [['maceta', 480], ['papelera', 1220]], supermercado: [['carpetas', 500], ['cono', 1220]], bilbao: [['cono', 470], ['papelera', 1230]], urjc: [['papelera', 480], ['carpetas', 1220]], mitin: [['valla', 470], ['cono', 1230]], granja: [['cono', 480], ['papelera', 1220]], palacio: [['maceta', 480], ['maceta', 1220]],
    granvia: [['cono', 480], ['papelera', 1220]], retiro: [['maceta', 480], ['papelera', 1220]], metro: [['maletin', 500], ['papelera', 1210]],
    neptuno: [['papelera', 480], ['valla', 1230]], senado: [['silla', 500], ['carpetas', 850], ['micro', 1200]],
    catalunya: [['maceta', 500], ['papelera', 1210]], plato: [['microabierto', 520], ['silla', 1190]], zarzuela: [['maceta', 500], ['maletin', 1200]], ferraz: [['valla', 480], ['cono', 1220]], genova: [['microabierto', 500], ['valla', 1210]], meco: [['cono', 480], ['maletin', 1220]], plazamayor: [['silla', 500], ['maceta', 1200]], arc: [['papelera', 480], ['cono', 1220]], colon: [['valla', 470], ['micro', 1230]], moncloa: [['micro', 540], ['maceta', 860], ['maletin', 1170]],
  };
  // dibuja un fotograma de efecto (fondo negro) en modo aditivo, girando el tono hacia 'color'
  function hueOf(hex) { const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (!d) return 200; return ((mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 + 360) % 360; }
  function vfx(name, x, y, w, h, color, alpha, flip) {
    const im = IMG['vfx/' + name]; if (!im || !im.complete || !im.naturalWidth) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha == null ? 1 : alpha;
    const deg = color ? Math.round(hueOf(color) - 200) : 0, src = color ? tinte(im, 'vfx/' + name + '|' + deg, `hue-rotate(${deg}deg)`) : im; // tono ya girado (ver tinte)
    ctx.imageSmoothingEnabled = true; ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.drawImage(src, -w / 2, -h / 2, w, h); ctx.restore();
  }

  // ---------- Entrada ----------
  const held = new Set(), pressed = new Set();
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return; // el campo del código secreto en el móvil escribe por su cuenta (touch.js)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Backspace'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code); Sound.init();
  });
  addEventListener('keyup', e => held.delete(e.code));
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.screen === 'fight' && S.mode !== 'online') S.autoPause = true; });
  // Un toque o clic sobre el juego cuenta como ENTER, salvo en los menús de elegir: allí el toque solo mueve el cursor
  // (en el móvil, tocar la cara que querías elegía sin querer al personaje marcado) y se confirma con PUÑO.
  const TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  // rejilla de retratos de la selección (estilo recreativa: centrada, 7 por fila); la usan el dibujo, el cursor y los toques
  // la rejilla se adapta a los que haya: siempre cabe entre los dos retratos y deja sitio debajo para los especiales
  const selGrid = () => { const n = GRID().length; let cols = 7, cs = 0;
    if (TOUCH && S.mode !== 'versus') { // en el móvil, la rejilla grande a la derecha del retrato: caras del tamaño de un dedo
      for (let c = 8; c <= 16; c++) { const q = Math.min(112, Math.floor(920 / c), Math.floor(500 / Math.ceil(n / c))); if (q > cs) { cs = q; cols = c; } }
      return { n, cols, cs, gx: Math.round(350 + (920 - cols * cs) / 2), gy: 100 };
    } for (let c = 7; c <= 14; c++) { const q = Math.min(84, Math.floor(584 / c), Math.floor(430 / Math.ceil(n / c))); if (q > cs) { cs = q; cols = c; } } return { n, cols, cs, gx: Math.round(W / 2 - cols * cs / 2), gy: 100 }; };
  addEventListener('pointerdown', e => {
    Sound.init();
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * VW / r.width - OX, y = (e.clientY - r.top) * H / r.height;
    if (S.zonas && S.zonas.length) { const z = S.zonas.find(q => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h); if (z) { z.fn(); return; } } // zonas que apunta el dibujo de las pantallas nuevas
    if (['mode', 'locos', 'conflictos', 'galeria', 'diario', 'rumbo', 'velocidad', 'estilo', 'dificultad'].includes(S.screen)) return; // ahí solo cuentan las zonas: un toque fuera no es ENTER
    if (S.screen === 'select') {
      if (y > 60 && y < 98 && Math.abs(x - W / 2) < 200) { S.tabTap = true; return; }
      const { n, cols, cs, gx, gy } = selGrid();
      const c = Math.floor((x - gx) / cs), row = Math.floor((y - gy) / cs);
      if (x < 340 && y > 90 && y < 610 && !S.apicked[0]) { pressed.add('KeyG'); return; } // tocar el retrato grande cambia de modo
      if (c < 0 || c >= cols || row < 0 || row >= Math.ceil(n / cols) || S.apicked[0]) return;
      const g = row * cols + c, K = S.picked[0] ? 'asel' : 'sel', i = g < n ? FIGHTERS.indexOf(GRID()[g]) : -1;
      if (i >= 0 && BASEF(FIGHTERS[S[K][0]]) !== FIGHTERS[i]) { S[K][0] = i; Sound.play('blip'); } else if (i >= 0) pressed.add('KeyF'); // la segunda vez que tocas la misma cara, la eliges
      return;
    }
    if (S.screen === 'decreto' && S.cartas) { const n = S.cartas.length, cw = 340, gap = 30, x0 = W / 2 - (n * cw + (n - 1) * gap) / 2, i = Math.floor((x - x0) / (cw + gap)); if (i >= 0 && i < n && y > 150 && y < 540) { S.decSel = i; pressed.add('Enter'); } return; }
    if (S.screen === 'debate') { S.debTap = Math.abs(x - W / 2) > Math.abs(y - H / 2) * 1.6 ? (x < W / 2 ? 'l' : 'r') : (y < H / 2 ? 'u' : 'd'); return; }
    if (S.screen === 'escandalo') { const i = Math.floor((y - 290) / 170); if (i >= 0 && i < 2) { S.escSel = i; pressed.add('Enter'); } return; }
    if (S.screen === 'stage') { if (x < W / 3) pressed.add('KeyA'); else if (x > W * 2 / 3) pressed.add('KeyD'); else pressed.add('Enter'); return; }
    if (S.screen === 'stats' && (x < W / 4 || x > W * 3 / 4)) { pressed.add(x < W / 4 ? 'KeyA' : 'KeyD'); return; } // en estadísticas los lados pasan de página y el centro sale
    if (S.screen === 'code') return; // en el código secreto un toque no es ENTER (con el campo vacío te sacaba al menú)
    if (S.screen === 'lab') { const i = Math.round((y - 168) / 40); if (i >= 0 && i < 9) { if (S.labSel === i) { if (x < W / 3) pressed.add('KeyA'); else if (x > W * 2 / 3) pressed.add('KeyD'); else pressed.add('Enter'); } else S.labSel = i; } return; }
    if (S.screen === 'net') { netTap(x, y); return; }
    if (S.screen === 'fight' && S.paused) { const i = Math.round((y - 330) / 52); if (i >= 0 && i <= 2) { S.pauseSel = i; pressed.add('Enter'); } return; }
    if (S.screen === 'result' && S.resOpts) { if (TOUCH) return; const i = Math.round((y - 520) / 40); if (i >= 0 && i < S.resOpts.length) { S.resSel = i; pressed.add('Enter'); } return; }
    pressed.add('Enter');
  });
  const KEYS = [
    { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS', punch: 'KeyF', kick: 'KeyG', sp1: 'KeyR', sp2: 'KeyT', super: 'KeyY', assist: 'KeyH' },
    { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown', punch: 'KeyK', kick: 'KeyL', sp1: 'KeyI', sp2: 'KeyO', super: 'KeyP', assist: 'KeyJ' },
  ];
  const PADBTN = { punch: 0, kick: 1, sp1: 2, sp2: 3, super: 5, assist: 4 };
  const padPrev = [{}, {}];
  function pad(i) { const g = navigator.getGamepads ? navigator.getGamepads()[i] : null; return g && g.connected ? g : null; }
  function readInput(p) {
    const k = KEYS[p], g = pad(p), o = {};
    for (const d of ['l', 'r', 'u', 'd']) o[d] = held.has(k[d]);
    for (const a of ['punch', 'kick', 'sp1', 'sp2', 'super', 'assist']) o[a] = pressed.has(k[a]);
    o.uEdge = pressed.has(k.u);
    if (g) {
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0, b = n => g.buttons[n] && g.buttons[n].pressed;
      o.l = o.l || ax < -0.4 || b(14); o.r = o.r || ax > 0.4 || b(15); o.u = o.u || ay < -0.5 || b(12); o.d = o.d || ay > 0.5 || b(13);
      for (const a in PADBTN) { const now = b(PADBTN[a]); if (now && !padPrev[p][a]) o[a] = true; padPrev[p][a] = now; }
    }
    return o;
  }
  // Eventos de menú (cualquier jugador)
  const menuPrev = {};
  function menu() {
    const m = { l: 0, r: 0, u: 0, d: 0, ok: 0, back: 0 };
    const any = (...c) => c.some(x => pressed.has(x));
    m.l = any('KeyA', 'ArrowLeft'); m.r = any('KeyD', 'ArrowRight'); m.u = any('KeyW', 'ArrowUp'); m.d = any('KeyS', 'ArrowDown');
    m.ok = any('Enter', 'Space', 'KeyF', 'KeyK'); m.back = any('Escape', 'Backspace'); m.alt = any('KeyG', 'KeyL');
    const g = pad(0);
    if (g) {
      const b = n => g.buttons[n] && g.buttons[n].pressed, ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      const st = { l: ax < -0.5 || b(14), r: ax > 0.5 || b(15), u: ay < -0.5 || b(12), d: ay > 0.5 || b(13), ok: b(0) || b(9), back: b(1), alt: b(2) };
      for (const k in st) { if (st[k] && !menuPrev[k]) m[k] = true; menuPrev[k] = st[k]; }
    }
    return m;
  }

  // ---------- Efectos del logo de la portada: rayos eléctricos alrededor y un brillo que lo cruza en diagonal ----------
  const logoCv = document.createElement('canvas'), logoCx = logoCv.getContext('2d');
  let bolts = [], boltT = 0;
  function makeBolt(x0, y0, x1, y1) { // rayo quebrado en tramos, con alguna rama
    const pts = [[x0, y0]], n = 9;
    for (let i = 1; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + (Math.random() - 0.5) * 34, y0 + (y1 - y0) * t + (Math.random() - 0.5) * 34]); }
    pts.push([x1, y1]); return pts;
  }
  function titleFX(lg, x, y, w, h) {
    const t = S.t, cx = x + w / 2, cy = y + h / 2;
    // halo que late detrás del logo
    const r = Math.max(w, h) * (0.62 + Math.sin(t * 0.08) * 0.04), g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    g.addColorStop(0, 'rgba(255,190,60,0.55)'); g.addColorStop(0.5, 'rgba(255,90,20,0.22)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // rayos: cada poco salen 2-4 desde el borde del logo hacia fuera y duran unos fotogramas
    if (--boltT <= 0) {
      boltT = 28 + Math.floor(Math.random() * 45); bolts = [];
      const k = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < k; i++) {
        const a = Math.random() * Math.PI * 2, ex = Math.cos(a), ey = Math.sin(a);
        const sx = cx + ex * w * 0.42, sy = cy + ey * h * 0.42, len = 170 + Math.random() * 190;
        bolts.push({ pts: makeBolt(sx, sy, sx + ex * len, sy + ey * len * 0.8), life: 10 + Math.floor(Math.random() * 6) });
      }
    }
    for (const b of bolts) {
      if (b.life-- <= 0) continue;
      if (b.life % 4 === 0) b.pts = makeBolt(b.pts[0][0], b.pts[0][1], b.pts[b.pts.length - 1][0], b.pts[b.pts.length - 1][1]); // parpadea cambiando de forma
      ctx.save(); ctx.lineJoin = 'miter'; ctx.lineCap = 'square';
      for (const [lw, col] of [[22, 'rgba(90,150,255,0.22)'], [10, 'rgba(150,200,255,0.8)'], [4, '#ffffff']]) {
        ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.beginPath(); b.pts.forEach(([px, py], i) => i ? ctx.lineTo(Math.round(px / 4) * 4, Math.round(py / 4) * 4) : ctx.moveTo(Math.round(px / 4) * 4, Math.round(py / 4) * 4)); ctx.stroke();
      }
      ctx.restore();
    }
    const flash = bolts.some(b => b.life > 8);
    // logo con el brillo diagonal (cada 4 s una banda clara lo atraviesa; solo se pinta sobre el propio logo)
    const cw = Math.ceil(w), ch = Math.ceil(h); if (logoCv.width !== cw || logoCv.height !== ch) { logoCv.width = cw; logoCv.height = ch; }
    logoCx.globalCompositeOperation = 'source-over'; logoCx.clearRect(0, 0, cw, ch); logoCx.drawImage(lg, 0, 0, cw, ch);
    const ph = (t % 240) / 60; // la pasada dura 1 s de cada 4
    if (ph < 1) {
      const bx = -cw * 0.4 + ph * cw * 1.8;
      const sg = logoCx.createLinearGradient(bx, 0, bx + ch * 0.9, ch);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.42, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.85)'); sg.addColorStop(0.58, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      logoCx.globalCompositeOperation = 'source-atop'; logoCx.fillStyle = sg; logoCx.fillRect(0, 0, cw, ch);
    }
    ctx.save(); if (flash) ctx.filter = 'brightness(1.3)'; ctx.drawImage(logoCv, x, y); ctx.restore();
    if (bolts.some(b => b.life > 12)) { ctx.fillStyle = 'rgba(200,225,255,0.18)'; ctx.fillRect(-OX, 0, VW, H); } // destello al caer los rayos
  }

  // ---------- Utilidades de dibujo ----------
  // La fuente pixel dibuja las mayúsculas acentuadas como minúsculas («ESPAñA», «MáS»), así que la tilde de las mayúsculas se pinta aparte:
  // se escribe la letra sin acento y encima se dibujan sus píxeles (tilde, virgulilla de la Ñ o diéresis), con el mismo contorno que el texto.
  const UPPER = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ñ': 'N', 'Ü': 'U' };
  const MARK = { acute: [[-1, 2], [0, 3]], tilde: [[-3, 2], [-2, 3], [-1, 3], [0, 2], [1, 2], [2, 3]], dots: [[-2, 3], [1, 3]] }; // [columna, fila] en píxeles de la fuente, desde el centro y el borde superior de la letra
  // ROTULOS ARCADE: todo texto grande se dibuja con la tipografía de los titulares, pasada a píxel (sin suavizado), con bandas de color, bisel,
  // contorno y sombra dura. Cada letra entra cayendo la primera vez que aparece el texto, y de vez en cuando le pasa un brillo.
  const RFONT = 'RotuloArcade', RQ = 2, R_MIN = 24; // RQ: 1 píxel del rótulo = 2 de pantalla, igual que los titulares de After Effects
  const rGlifos = new Map(), rLayout = new Map(), rVisto = new Map(), rLinea = new Map(), rCan = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  let rListo = false; if (document.fonts && document.fonts.load) document.fonts.load(`40px ${RFONT}`, 'ÁÑ¡¿').then(f => { rListo = f.length > 0; }).catch(() => {});
  const rRgb = c => { c = String(c || '#fff'); let m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c); if (m) return [1, 2, 3].map(i => parseInt(m[i] + m[i], 16)); m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c); if (m) return [1, 2, 3].map(i => parseInt(m[i], 16)); m = /rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/.exec(c); return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255]; };
  const rMix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
  const R_PAL = { '#ffe14a': ['#fffbd0', '#ffe14a', '#ffb31f', '#ef6a10'], '#ff3b30': ['#ffd9a0', '#ff8a3a', '#ff3b30', '#b00f2c'], '#fff': ['#ffffff', '#ffffff', '#d6e6ff', '#8fb0e8'], '#3ddc6a': ['#e4ffd8', '#7df08e', '#3ddc6a', '#128a4a'] };
  const rPaleta = c => { if (R_PAL[c]) return R_PAL[c].map(rRgb); const b = rRgb(c), W_ = [255, 255, 255]; return [rMix(b, W_, 0.65), rMix(b, W_, 0.2), b, rMix(b, [0, 0, 0], 0.32)]; };
  function rGlifo(ch, size, color, stroke) {
    const k = ch + '|' + size + '|' + color + '|' + stroke; let g = rGlifos.get(k); if (g) return g;
    if (rGlifos.size > 1200) rGlifos.clear();
    const fs = Math.round(size * 1.3 / RQ), o = Math.max(1, Math.round(size * 0.05 / RQ)), d = Math.max(1, Math.round(size * 0.07 / RQ)), pad = o + 3; rCan.font = `${fs}px ${RFONT}`;
    const by = pad + Math.ceil(fs * 1.25), w = Math.ceil(rCan.measureText(ch).width) + pad * 2 + 4, h = by + Math.ceil(fs * 0.45) + o + d + 2, m = rCan.measureText('H'), capH = Math.max(1, Math.round(m.actualBoundingBoxAscent)), capT = by - capH;
    const t = document.createElement('canvas'); t.width = w; t.height = h; const c = t.getContext('2d', { willReadFrequently: true }); c.font = rCan.font; c.textBaseline = 'alphabetic'; c.fillStyle = '#000'; c.fillText(ch, pad, by);
    const A = c.getImageData(0, 0, w, h).data, on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && A[(y * w + x) * 4 + 3] >= 110, pal = rPaleta(color), st = rRgb(stroke), ext = rMix(st, [0, 0, 0], 0.5);
    const mk = () => { const n = document.createElement('canvas'); n.width = w; n.height = h; const x = n.getContext('2d'); return { n, x, im: x.createImageData(w, h) }; }, base = mk(), fill = mk(), luz = mk();
    const put = (L, x, y, col) => { const i = (y * w + x) * 4; L.im.data[i] = col[0]; L.im.data[i + 1] = col[1]; L.im.data[i + 2] = col[2]; L.im.data[i + 3] = 255; };
    const orla = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) { for (let b = -o; b <= o; b++) for (let a = -o; a <= o; a++) if (a * a + b * b <= o * o + 1) { const X = x + a, Y = y + b; if (X >= 0 && Y >= 0 && X < w && Y < h) orla[Y * w + X] = 1; } }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (orla[y * w + x]) for (let e = 1; e <= d; e++) if (y + e < h && !orla[(y + e) * w + x]) put(base, x, y + e, ext);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (orla[y * w + x]) put(base, x, y, st);
      if (!on(x, y)) continue; let col = pal[Math.max(0, Math.min(3, Math.floor((y - capT) / capH * 4)))];
      if (capH >= 10) { if (!on(x, y - 1)) col = rMix(col, [255, 255, 255], 0.6); else if (!on(x, y + 1)) col = rMix(col, st, 0.4); }
      put(fill, x, y, col); put(luz, x, y, rMix(col, [255, 255, 255], 0.72)); }
    for (const L of [base, fill, luz]) { L.x.putImageData(L.im, 0, 0); fija(L.n); } // ya no cambian: a imagen (ver fija)
    g = { base: base.n, fill: fill.n, luz: luz.n, w, h, pad, by, capH }; rGlifos.set(k, g); return g;
  }
  function rEntrada(s, now) {
    let v = rVisto.get(s); if (v && now - v.last < 400) { v.last = now; return v; }
    const lim = s.replace(/[_\s]+$/, ''); let sigue = s.length <= 2 || /^[\d:.\s+%-]+$/.test(s); // números que cambian (el reloj) y textos que se van escribiendo no vuelven a caer enteros
    if (!sigue && lim) for (const [o, r] of rVisto) { const ol = o.replace(/[_\s]+$/, ''); if (now - r.last < 400 && ol && (lim.startsWith(ol) || ol.startsWith(lim))) { sigue = true; break; } }
    if (rVisto.size > 300) rVisto.clear();
    v = { start: sigue ? now - 1e5 : now, last: now, quieto: /^[\d:.\s+%-]+$/.test(s) }; rVisto.set(s, v); return v;
  }
  function rotulo(s, x, y, size, color, align, stroke) {
    size = Math.round(size); color = color || '#fff'; stroke = stroke || '#0c0614';
    const lk = s + '|' + size; let L = rLayout.get(lk);
    if (!L) { if (rLayout.size > 800) rLayout.clear(); const fs = Math.round(size * 1.3 / RQ), tr = size >= 40 ? 1 : 0; rCan.font = `${fs}px ${RFONT}`; const sp = Math.max(2, Math.round(fs * 0.16)), ch = Array.from(s), xs = []; let pre = '', hue = 0; ch.forEach((c, i) => { xs.push((rCan.measureText(pre).width + tr * i + hue * sp) * RQ); pre += c; if (c === ' ') hue++; }); L = { ch, xs, w: (rCan.measureText(s).width + tr * (ch.length - 1) + hue * sp) * RQ }; rLayout.set(lk, L); }
    const now = performance.now(), v = rEntrada(s, now), n = L.ch.length, gap = Math.min(30, 360 / Math.max(1, n)), age = now - v.start, x0 = align === 'left' ? x : align === 'right' ? x - L.w : x - L.w / 2;
    const snap = a => Math.round(a / RQ) * RQ, was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    const brillo = v.quieto ? -9 : ((age % 3400) / 700 - 0.4) * n, ola = !v.quieto && size >= 30, items = [];
    L.ch.forEach((c, i) => {
      if (c === ' ') return; const tt = (age - i * gap) / 260; if (tt < 0) return; const g = rGlifo(c, size, color, stroke); let dy = 0;
      if (tt < 1) { const b = 1 - tt; dy = -Math.abs(Math.cos(tt * 4.2)) * b * b * size * 0.9; }
      else if (ola) dy = Math.round(Math.sin(now * 0.0045 + i * 0.55) * 1.2) * RQ;
      items.push([g, snap(x0 + L.xs[i] - g.pad * RQ), snap(y + g.capH * RQ / 2 - g.by * RQ + dy), Math.abs(i - brillo) < 1.2]);
    });
    const cae = L.ch.some((c, i) => c !== ' ' && (age - i * gap) / 260 < 1);
    if (!cae && !ola && items.length > 1 && ctx.globalAlpha === 1) {
      // RENDIMIENTO: con el texto ya quieto, contorno y relleno de todas las letras van montados en un solo lienzo (se hace una vez)
      // y se pinta de golpe; encima, la letra a la que le pasa el brillo. Antes eran dos imágenes por letra en cada fotograma.
      const lx0 = items.reduce((a, it) => Math.min(a, it[1]), 1e9), ly0 = items.reduce((a, it) => Math.min(a, it[2]), 1e9);
      const key = lk + '|' + color + '|' + stroke + '|' + items.map(it => (it[1] - lx0) + ',' + (it[2] - ly0)).join(';');
      let c = rLinea.get(key);
      if (!c) {
        if (rLinea.size > 150) rLinea.clear();
        c = document.createElement('canvas'); c.width = Math.max(...items.map(it => (it[1] - lx0) / RQ + it[0].w)); c.height = Math.max(...items.map(it => (it[2] - ly0) / RQ + it[0].h));
        const q = c.getContext('2d'); for (const [g, gx, gy] of items) q.drawImage(g.base, (gx - lx0) / RQ, (gy - ly0) / RQ); for (const [g, gx, gy] of items) q.drawImage(g.fill, (gx - lx0) / RQ, (gy - ly0) / RQ);
        rLinea.set(key, c); fija(c);
      }
      ctx.drawImage(vista(c), lx0, ly0, c.width * RQ, c.height * RQ);
      for (const [g, gx, gy, hi] of items) if (hi) ctx.drawImage(vista(g.luz), gx, gy, g.w * RQ, g.h * RQ);
    } else {
      for (const [g, gx, gy] of items) ctx.drawImage(vista(g.base), gx, gy, g.w * RQ, g.h * RQ);
      for (const [g, gx, gy, hi] of items) ctx.drawImage(vista(hi ? g.luz : g.fill), gx, gy, g.w * RQ, g.h * RQ);
    }
    ctx.imageSmoothingEnabled = was;
  }
  function text(s, x, y, size, color, align, stroke) {
    size = tam(size);
    if (window.__aud) window.__aud(s, x, y, size, align); // solo para pruebas: revisa que los textos caben en sus cajas
    if (size >= R_MIN && rListo && s !== '' && s != null) return rotulo(String(s), x, y, size, color, align, stroke);
    let marks = null; s = String(s).replace(/[ÁÉÍÓÚÑÜ]/g, (c, i) => { (marks = marks || []).push([i, c]); return UPPER[c]; });
    ctx.font = `${size}px ${FONT}`; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const lw = Math.max(4, size * 0.3);
    ctx.lineWidth = lw; ctx.strokeStyle = stroke || '#000'; ctx.strokeText(s, x, y);
    ctx.fillStyle = color || '#fff'; ctx.fillText(s, x, y);
    if (!marks) return;
    const w = ctx.measureText(s).width, x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2, u = size / 8, o = lw / 2;
    ctx.textAlign = 'left'; const mN = ctx.measureText('N'), top = y - mN.actualBoundingBoxAscent, half = (mN.actualBoundingBoxRight - mN.actualBoundingBoxLeft) / 2 - u / 2;
    const px = marks.map(([i, c]) => { const cx = x0 + ctx.measureText(s.slice(0, i)).width + half; return MARK[c === 'Ñ' ? 'tilde' : c === 'Ü' ? 'dots' : 'acute'].map(([dx, dy]) => [cx + dx * u, top - dy * u]); }).flat();
    ctx.fillStyle = stroke || '#000'; for (const [ax, ay] of px) ctx.fillRect(ax - o, ay - o, u + o * 2, u + o);
    ctx.fillStyle = color || '#fff'; for (const [ax, ay] of px) ctx.fillRect(ax, ay, u, u);
    ctx.textAlign = align || 'center';
  }
  // Reparto de un texto en líneas: las mínimas que quepan en maxW, pero equilibradas (sin una última línea de una sola palabra)
  // y sin dejar colgando al final de línea un artículo, una preposición o una conjunción.
  const WEAK = new Set(['a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'lo', 'los', 'ni', 'o', 'por', 'que', 'se', 'si', 'su', 'sus', 'un', 'una', 'y', 'es', 'no', 'tu', 'mi', 'para', 'sin', 'le', 'me', 'te', 'pero']);
  function wrapLines(s, size, maxW) {
    size = tam(size);
    ctx.font = `${size}px ${FONT}`; const words = String(s).split(' ').filter(Boolean), wd = t => ctx.measureText(t).width;
    const greedy = lim => { const out = []; let line = ''; for (const w of words) { const next = line ? line + ' ' + w : w; if (line && wd(next) > lim) { out.push(line); line = w; } else line = next; } if (line) out.push(line); return out; };
    let lines = greedy(maxW); const n = lines.length;
    if (n > 1) { // se estrecha el ancho mientras siga saliendo el mismo número de líneas: así quedan parejas
      let lo = wd(s) / n, hi = maxW;
      for (let k = 0; k < 12; k++) { const mid = (lo + hi) / 2, l = greedy(mid); if (l.length <= n && l.every(x => wd(x) <= maxW)) { hi = mid; lines = l; } else lo = mid; }
      for (let i = 0; i < lines.length - 1; i++) { // palabra débil al final de línea: baja a la siguiente si cabe
        const ws = lines[i].split(' '), last = ws[ws.length - 1].toLowerCase().replace(/[^a-záéíóúñü]/g, '');
        if (ws.length > 2 && WEAK.has(last) && !/[.,:;!?…]$/.test(ws[ws.length - 1]) && wd(ws[ws.length - 1] + ' ' + lines[i + 1]) <= maxW) { lines[i + 1] = ws.pop() + ' ' + lines[i + 1]; lines[i] = ws.join(' '); }
      }
    }
    return lines;
  }
  // shown: si se indica, solo se dibujan los primeros «shown» caracteres (efecto máquina de escribir) sin que cambien los saltos de línea
  function wrap(s, x, y, size, color, maxW, lh, shown) {
    const lines = wrapLines(s, size, maxW); let left = shown == null ? Infinity : shown;
    lines.forEach((l, i) => {
      if (left <= 0) return;
      if (left >= l.length) text(l, x, y + i * (lh || size * 1.6), size, color);
      else { ctx.font = `${tam(size)}px ${FONT}`; text(l.slice(0, left), x - ctx.measureText(l).width / 2, y + i * (lh || size * 1.6), size, color, 'left'); } // la línea a medias se escribe desde su posición final
      left -= l.length + 1;
    });
    return lines.length;
  }
  function sprite(id, pose, x, y, scale, dir, alpha) {
    const m = META[id][pose], im = IMG[id + '/' + pose]; if (!m || !im || !im.complete) return;
    ctx.save(); ctx.translate(x, y); ctx.scale((dir || 1) * scale, scale); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(im, -m.ax, -m.h, m.w, m.h); ctx.restore();
  }
  // ---------- Fondos animados ----------
  // Lo que se mueve de verdad (banderas, público, agua) son fotogramas dibujados: ver herramientas/fondos_animados.py.
  // Aquí solo van los añadidos por código, en coordenadas del escenario (1698 x 720):
  //   flash: zonas donde saltan flashes de cámara     glow [x, y, radio]: farolas y lámparas que titilan
  //   neon [x, y, ancho, alto]: rótulo que parpadea    birds: pájaros cruzando el cielo    pigeons: palomas del suelo
  const STAGE_LAYERS = ['granvia', 'retiro', 'metro', 'congreso', 'cibeles', 'sol', 'moncloa', 'ayuntamiento', 'catalunya', 'neptuno', 'zarzuela', 'plato', 'ferraz', 'genova', 'meco', 'plazamayor', 'arc', 'colon', 'artes', 'circuito', 'aytovalencia', 'habana', 'chicago', 'alo', 'congresoar', 'riogallegos', 'laboca', 'olivos', 'mountvernon', 'venice'];
  const MUSIC_OF = { mountvernon: 'washington', venice: 'washington', habana: 'caracas', chicago: 'washington', alo: 'caracas', congresoar: 'buenosaires', riogallegos: 'buenosaires', laboca: 'buenosaires', olivos: 'buenosaires', soto: 'senado', marbella: 'sol', cumbre: 'moncloa', zarzuela: 'senado', plato: 'sol', ferraz: 'congreso', genova: 'cibeles', meco: 'senado', plazamayor: 'sol', arc: 'catalunya', colon: 'neptuno', artes: 'neptuno', circuito: 'sol', aytovalencia: 'cibeles', parlament: 'catalunya', sevilla: 'sol', hacienda: 'senado', santander: 'neptuno', supremo: 'senado', exteriores: 'congreso', supermercado: 'sol', bilbao: 'catalunya', urjc: 'cibeles', mitin: 'sol', granja: 'neptuno', palacio: 'senado', granvia: 'sol', retiro: 'neptuno', metro: 'senado' }; // escenarios que comparten música con otro
  const STAGE_FX = {
    congreso: { flash: [[10, 400, 350, 50], [1335, 400, 355, 50]], birds: 3 },
    cibeles: { flash: [[0, 230, 500, 110], [1200, 230, 490, 110]], glow: [[615, 68, 46], [1075, 68, 46], [1170, 10, 40]] },
    sol: { neon: [[1258, 158, 182, 118]], glow: [[25, 128, 60], [135, 146, 60], [712, 320, 40], [770, 320, 40], [1288, 378, 34], [1322, 378, 34]] },
    moncloa: { birds: 2 }, zarzuela: { birds: 3 }, meco: { birds: 3, flash: [[1360, 560, 300, 60]] }, plazamayor: { birds: 4 }, granvia: { birds: 2 }, retiro: { birds: 5 }, arc: { birds: 4 }, colon: { birds: 2 }, artes: { birds: 3 }, circuito: { birds: 2 }, aytovalencia: { birds: 4 },
    ferraz: { flash: [[20, 420, 600, 60], [1080, 400, 320, 60]] }, genova: { flash: [[230, 420, 1240, 70]] },
    // sign [x, y, ancho, alto]: rótulo luminoso de APLAUSOS que se enciende a ratos
    plato: { sign: [[20, 176, 168, 84], [1512, 176, 168, 84]], glow: [[622, 132, 60], [782, 132, 60], [902, 132, 60], [1062, 132, 60], [60, 96, 50], [1640, 96, 50]], flash: [[0, 250, 250, 120], [1450, 250, 248, 120]] },
    ayuntamiento: { birds: 4 },
    // pigeons: [sprite, x, y del suelo]; picotean, dan saltitos y echan a volar si un luchador se acerca
    catalunya: { flyers: 3,
      pigeons: [['g0', 172, 534], ['g1', 358, 528], ['g2', 406, 512], ['g4', 519, 504], ['g5', 592, 534], ['g6', 951, 537], ['g7', 996, 534], ['g8', 1121, 516], ['g9', 1291, 521], ['g10', 1329, 519], ['g2', 700, 520], ['g7', 780, 536], ['g0', 1480, 530]] },
    neptuno: { flash: [[0, 410, 460, 60], [1180, 410, 510, 60]], glow: [[235, 290, 40], [537, 310, 36], [1118, 318, 36], [1450, 290, 40]] },
    senado: { glow: [[668, 238, 92], [1028, 238, 92], [615, 358, 44], [1082, 358, 44], [480, 12, 70], [1210, 12, 70]] },
  };
  const fxState = {}; let fxTick = 0, fxActors = [];
  const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  function animStage(id, camX, noche) { // noche: fotogramas nocturnos (<id>_noche_vNN/_b/_c) y luces del escenario apagadas
    const fx = STAGE_FX[id] || {}, im = IMG['stage/' + id]; if (!im || !im.complete || !im.naturalWidth) return;
    const t = ++fxTick, k = im.naturalWidth / STAGE_W, ky = im.naturalHeight / H, st = fxState[id] || (fxState[id] = { fl: [], birds: [] });
    const vis = (x, w) => x + w > camX && x < camX + W;
    // fotogramas dibujados (banderas, público, agua): capas <id>_b y <id>_c que se alternan sobre el fondo, base > b > c > b
    // cada fotograma dura ~0,3 s y pasa al siguiente con un fundido corto, para que no dé saltos
    // fondos en vídeo: bucle largo de fotogramas pixel art (herramientas/fondos_video.py); si aún no han cargado, se queda el fondo fijo
    const nv = (window.STAGE_VIDEO || {})[id];
    if (nv) { const n = (Math.floor(t / 12) % nv) + 1, L = noche ? capaNoche(id, 'v' + String(n).padStart(2, '0')) : IMG[`stage/${id}_v${n}`]; if (L && L.complete && L.naturalWidth) ctx.drawImage(L, -camX, 0, STAGE_W, H); }
    const SEQ = nv ? [null, null, null, null] : [null, 'b', 'c', 'b'], ph = t / 18, i0 = Math.floor(ph) % 4, fr = ph - Math.floor(ph), mix = Math.max(0, Math.min(1, (fr - 0.55) / 0.45)), mixS = mix * mix * (3 - 2 * mix);
    const layOf = k => { const L = k && (noche ? capaNoche(id, k) : IMG['stage/' + id + '_' + k]); return L && L.complete && L.naturalWidth ? L : null; };
    const A = layOf(SEQ[i0]), B = layOf(SEQ[(i0 + 1) % 4]);
    if (A) { ctx.globalAlpha = B ? 1 : 1 - mixS; ctx.drawImage(A, -camX, 0, STAGE_W, H); }
    if (B && mixS > 0) { ctx.globalAlpha = mixS; ctx.drawImage(B, -camX, 0, STAGE_W, H); }
    ctx.globalAlpha = 1;
    // luces
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (!noche) (fx.glow || []).forEach((g, i) => { if (!vis(g[0] - g[2], g[2] * 2)) return; const a = 0.2 + 0.07 * Math.sin(t * 0.09 + i * 2) + (hash(Math.floor(t / 4) + i) > 0.93 ? -0.1 : 0); const x = g[0] - camX, gr = ctx.createRadialGradient(x, g[1], 0, x, g[1], g[2]); gr.addColorStop(0, `rgba(255,226,150,${a})`); gr.addColorStop(1, 'rgba(255,226,150,0)'); ctx.fillStyle = gr; ctx.fillRect(x - g[2], g[1] - g[2], g[2] * 2, g[2] * 2); });
    if (!noche) for (const r of fx.neon || []) { const off = t % 420 > 396 && Math.floor(t / 4) % 2; if (!off) { const a = 0.13 + 0.07 * Math.sin(t * 0.12), cx = r[0] + r[2] / 2 - camX, cy = r[1] + r[3] / 2, gr = ctx.createRadialGradient(cx, cy, 10, cx, cy, r[2] * 0.75); gr.addColorStop(0, `rgba(255,150,60,${a})`); gr.addColorStop(1, 'rgba(255,90,160,0)'); ctx.fillStyle = gr; ctx.fillRect(cx - r[2], cy - r[2], r[2] * 2, r[2] * 2); } }
    // flashes de cámara
    if (!noche) for (const z of fx.flash || []) if (Math.random() < 0.035) st.fl.push({ x: z[0] + Math.random() * z[2], y: z[1] + Math.random() * z[3], t: 0 });
    st.fl = st.fl.filter(f => ++f.t < 8);
    for (const f of st.fl) { const x = f.x - camX, r = 30 - f.t * 2, gr = ctx.createRadialGradient(x, f.y, 0, x, f.y, r); gr.addColorStop(0, `rgba(255,255,255,${1 - f.t / 8})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, f.y - r, r * 2, r * 2); }
    ctx.restore();
    if (!noche) for (const r of fx.neon || []) if (t % 420 > 396 && Math.floor(t / 4) % 2) { ctx.fillStyle = 'rgba(20,10,40,0.5)'; ctx.fillRect(r[0] - camX, r[1], r[2], r[3]); }
    // palomas: las del suelo picotean y saltan; si un luchador se acerca, levantan el vuelo y vuelven al rato
    if (fx.pigeons) {
      const PK = 1 / 1.13, spr = (n, x, y, flip) => { const p = IMG['vfx/paloma_' + n]; if (!p || !p.complete || !p.naturalWidth) return; const w = p.naturalWidth * PK, h = p.naturalHeight * PK; ctx.save(); ctx.translate(Math.round(x - camX), Math.round(y)); if (flip) ctx.scale(-1, 1); ctx.imageSmoothingEnabled = false; ctx.drawImage(p, -w / 2, -h, w, h); ctx.restore(); ctx.imageSmoothingEnabled = false; };
      if (!st.pg) st.pg = fx.pigeons.map((p, i) => ({ n: p[0], x0: p[1], y0: p[2], x: p[1], y: p[2], mode: 'ground', t: 0, ph: hash(i + 3) * 400, flip: hash(i * 7) > 0.5, vx: 0, vy: 0 }));
      if (!st.fly) st.fly = Array.from({ length: fx.flyers || 0 }, (_, i) => ({ x: hash(i + 11) * STAGE_W, y: 300 + hash(i * 2 + 5) * 120, v: -(2.2 + hash(i) * 1.4), ph: hash(i * 9) * 20 }));
      for (const b of st.fly) { b.x += b.v; if (b.x < -80) { b.x = STAGE_W + 80 + hash(t + b.ph) * 900; b.y = 280 + hash(t * 3 + b.ph) * 150; } spr(Math.floor((t + b.ph) / 6) % 2 ? 'f4' : 'f1', b.x, b.y + Math.sin((t + b.ph) * 0.08) * 8, Math.floor((t + b.ph) / 6) % 2 ? false : true); }
      for (const p of st.pg) {
        p.t++;
        if (p.mode === 'ground') {
          const near = fxActors.find(f => Math.abs(f.x - p.x) < 120 && (f.vx || f.state === 'attack' || f.state === 'dash'));
          if (near) { p.mode = 'fly'; p.t = 0; p.vx = (p.x >= near.x ? 1 : -1) * (3 + hash(p.ph + t) * 3); p.vy = -(4 + hash(p.ph * 2 + t) * 2); }
          const c = (t + p.ph) % 400, hop = c < 30 && Math.floor(c / 5) % 2 ? -3 : 0, peck = c > 200 && c < 260 && Math.floor(c / 8) % 2 ? 2 : 0;
          if (c > 300 && c < 360) { p.x += p.flip ? -0.4 : 0.4; } if (c === 399 || Math.abs(p.x - p.x0) > 40) p.flip = p.x > p.x0 ? true : p.x < p.x0 ? false : !p.flip;
          spr(p.n, p.x, p.y + hop + peck, p.flip);
        } else if (p.mode === 'fly') {
          p.x += p.vx; p.y += p.vy; p.vy -= 0.05; spr(Math.floor(p.t / 5) % 2 ? 'f4' : 'f1', p.x, p.y, Math.floor(p.t / 5) % 2 ? p.vx > 0 : p.vx < 0);
          if (p.y < -60 || p.t > 200) { p.mode = 'away'; p.t = 0; }
        } else if (p.mode === 'away') { if (p.t > 260 + p.ph * 0.5 && !fxActors.some(f => Math.abs(f.x - p.x0) < 200)) { p.mode = 'land'; p.t = 0; p.x = p.x0 + (hash(p.ph) > 0.5 ? 260 : -260); p.y = -40; } }
        else { const u = Math.min(1, p.t / 90); p.x += (p.x0 - p.x) * 0.045; p.y += (p.y0 - p.y) * 0.045; spr(Math.floor(p.t / 5) % 2 ? 'f4' : 'f1', p.x, p.y, Math.floor(p.t / 5) % 2 ? p.x < p.x0 : p.x > p.x0); if (u >= 1 || Math.abs(p.y - p.y0) < 2) { p.mode = 'ground'; p.x = p.x0; p.y = p.y0; p.t = 0; } }
      }
    }
    if (!noche) for (const r of fx.sign || []) { if (!vis(r[0], r[2])) continue; const on = t % 300 < 150 && Math.floor(t / 14) % 2 === 0, x = r[0] - camX;
      ctx.fillStyle = '#0d1022'; ctx.fillRect(x, r[1], r[2], r[3]); ctx.lineWidth = 4; ctx.strokeStyle = on ? '#fff' : '#445'; ctx.strokeRect(x + 6, r[1] + 12, r[2] - 12, r[3] - 24);
      text('APLAUSOS', x + r[2] / 2, r[1] + r[3] / 2, 13, on ? '#fff' : '#556'); }
    // pájaros
    while (st.birds.length < (fx.birds || 0)) { const i = st.birds.length; st.birds.push({ x: hash(i + id.length) * STAGE_W, y: 40 + hash(i * 3 + 1) * 130, v: (1.1 + hash(i * 5) * 1.2) * (i % 2 ? 1 : -1), p: hash(i) * 6 }); }
    ctx.fillStyle = 'rgba(40,40,60,0.85)';
    for (const b of st.birds) {
      b.x += b.v; if (b.x < -40) b.x = STAGE_W + 40; if (b.x > STAGE_W + 40) b.x = -40;
      const x = Math.round(b.x - camX), y = Math.round(b.y + Math.sin(t * 0.03 + b.p) * 10), up = Math.sin(t * 0.3 + b.p) > 0 ? -3 : 3;
      ctx.fillRect(x - 3, y, 6, 3); ctx.fillRect(x - 9, y + up, 6, 3); ctx.fillRect(x + 3, y + up, 6, 3);
    }
  }
  // escenarios de noche (apagón): versión nocturna de cada fondo hecha con Gemini a partir del original; se cargan al necesitarlas
  const STAGE_NOCHE = new Set(['alo', 'arc', 'artes', 'aytovalencia', 'ayuntamiento', 'bilbao', 'buenosaires', 'canarias', 'caracas', 'catalunya', 'ceuta', 'chicago', 'cibeles', 'circuito', 'colon', 'congreso', 'congresoar', 'cumbre', 'exteriores', 'ferraz', 'genova', 'granja', 'habana', 'hacienda', 'jerusalen', 'laboca', 'marbella', 'meco', 'melilla', 'mitin', 'moncloa', 'montevideo', 'moscu', 'mountvernon', 'neptuno', 'olivos', 'palacio', 'paris', 'parlament', 'pekin', 'plato', 'plazamayor', 'pyongyang', 'riogallegos', 'roma', 'santander', 'senado', 'sevilla', 'sol', 'soto', 'supermercado', 'supremo', 'urjc', 'venice', 'washington', 'zarzuela']);
  const capaNoche = (id, k) => { const key = 'stage/' + id + '_noche_' + k; if (!IMG[key]) { const im = new Image(); im.src = V(`assets/stages/${id}_noche_${k}.webp`); IMG[key] = im; } return IMG[key]; };
  const nocheDe = id => { if (!STAGE_NOCHE.has(id)) return null; const k = 'stage/' + id + '_noche'; if (!IMG[k]) { const im = new Image(); im.src = V(`assets/stages/${id}_noche.webp`); IMG[k] = im; } const im = IMG[k]; return im.complete && im.naturalWidth ? im : null; };
  function drawStage(id, camX, dark, anim, noche) {
    const im = IMG['stage/' + id], nim = noche ? nocheDe(id) : null;
    if (nim) ctx.drawImage(nim, -camX, 0, STAGE_W, H); // de noche no hay banderas ni público animados: se ha ido la luz
    else if (im && im.complete && im.naturalWidth) ctx.drawImage(im, -camX, 0, STAGE_W, H); else { ctx.fillStyle = '#223'; ctx.fillRect(-OX, 0, VW, H); }
    const bi = nim || (im && im.complete && im.naturalWidth ? im : null);
    if (bi && OX) { // pantallas más anchas que el escenario: el margen se rellena con el borde del escenario en espejo
      const k = bi.naturalWidth / STAGE_W, ml = OX - camX, mr = W + OX - (STAGE_W - camX);
      if (ml > 0) { ctx.save(); ctx.translate(-camX, 0); ctx.scale(-1, 1); ctx.drawImage(bi, 0, 0, ml * k, bi.naturalHeight, 0, 0, ml, H); ctx.restore(); }
      if (mr > 0) { ctx.save(); ctx.translate(STAGE_W - camX, 0); ctx.scale(-1, 1); ctx.drawImage(bi, bi.naturalWidth - mr * k, 0, mr * k, bi.naturalHeight, -mr, 0, mr, H); ctx.restore(); }
    }
    if (anim) animStage(id, camX, !!nim);
    ctx.imageSmoothingEnabled = false;
    if (dark) { ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(-OX, 0, VW, H); }
  }

  // ---------- Movimientos ----------
  const BASE = {
    punch: { pose: 'punch', st: 4, ac: 3, rc: 8, dmg: 6, band: [0.45, 0.95], push: 5, stun: 13, sfx: 'punch' },
    kick: { pose: 'kick', st: 6, ac: 4, rc: 11, dmg: 9, band: [0.3, 0.95], push: 8, stun: 16, sfx: 'kick' },
    low: { pose: 'low', st: 5, ac: 4, rc: 11, dmg: 7, band: [0, 0.4], push: 5, stun: 14, sfx: 'kick' },
    air: { pose: 'air', st: 2, ac: 16, rc: 0, dmg: 8, band: [-0.1, 0.8], push: 6, stun: 16, sfx: 'kick' },
    airp: { pose: 'airp', st: 2, ac: 12, rc: 0, dmg: 7, band: [0, 0.75], push: 5, stun: 14, sfx: 'punch' },
    // gancho ascendente: solo sale con comando (adelante, abajo, adelante + puño); lanza al rival por los aires
    gancho: { pose: 'jumpup', st: 3, ac: 16, rc: 12, dmg: 12, band: [0.3, 1.6], push: 4, kd: true, launch: true, upper: true, vx: 3, special: true, sfx: 'heavy' },
    // poderes extra, solo con comando: barrido deslizante, puñetazo cargado y proyectil antiaéreo
    slide: { pose: 'low', st: 5, ac: 16, rc: 14, dmg: 9, band: [0, 0.4], push: 6, kd: true, vx: 13, special: true, sfx: 'heavy' },
    cargado: { pose: 'punch', st: 14, ac: 8, rc: 18, dmg: 15, band: [0.4, 0.95], push: 14, kd: true, vx: 9, special: true, sfx: 'heavy' },
    antiaereo: { pose: 'sp1', st: 9, ac: 1, rc: 18, proj: true, up: true },
    sp1: { pose: 'sp1', st: 10, ac: 1, rc: 16, proj: true },
    super: { pose: 'super', st: 22, ac: 104, rc: 24 },
    throw: { pose: 'punch', st: 10, ac: 1, rc: 12, proj: true },
  };
  // combos: un golpe que conecta se puede cancelar en otro de nivel superior (puño > patada/barrido > especial > súper)
  const LV = { punch: 1, kick: 2, low: 2, gancho: 3, slide: 3, cargado: 3, antiaereo: 3, sp1: 3, sp2: 3, super: 4 };
  const EXTRA = { gancho: '¡Gancho!', slide: '¡Barrido deslizante!', cargado: '¡Puñetazo cargado!', antiaereo: '¡Antiaéreo!' };
  const CHAIN_MAX = { normal: 3, turbo: 5 }; let VELOCIDAD = 'normal'; let ESTILO = 'todo'; // ESTILO: 'todo' (especiales, objetos y súper) o 'puno' (A PUÑO LIMPIO: solo golpes; la barra es el CABREO)
  const CABREO_T = 360, CABREO_VEL = 1.3, CABREO_DMG = 1.4, CABREO_COL = ['#fff6d8', '#ffd25a', '#ff9a2e', '#ff5a1f', '#d8261a', '#8e1414', '#4a0b0b', '#220505'];
  const AURA = { a: document.createElement('canvas'), b: document.createElement('canvas'), c: document.createElement('canvas') }; // lienzos del aura del CABREO
  const SOLO_PUNO = new Set(['super', 'antiaereo', 'sp1', 'sp2']); // en A PUÑO LIMPIO no hay proyectiles, cargas ni súper // golpes normales seguidos que se pueden encadenar
  const canCancel = (cur, nx, chain) => LV[cur] && LV[nx] && (LV[nx] > LV[cur] || (LV[cur] <= 2 && LV[nx] <= 2 && chain < CHAIN_MAX[VELOCIDAD]));
  const BTNS = ['punch', 'kick', 'sp1', 'sp2', 'super', 'assist'];
  function moveOf(f, name) {
    if (name !== 'sp2') return BASE[name];
    const s = f.def.sp2;
    // vuela hacia el rival, da un puñetazo en el aire y vuelve a su sitio
    if (s.type === 'falcon') return { pose: 'sp2', st: 10, ac: 46, rc: 14, dmg: s.dmg, band: [0.3, 0.95], push: 10, kd: true, falcon: true, vx: s.vx, special: true, sfx: 'heavy' };
    if (s.type === 'upper') return { pose: 'sp2', st: 5, ac: 22, rc: 14, dmg: s.dmg, band: [0.2, 1.5], push: 6, kd: true, upper: true, vx: s.vx, special: true, sfx: 'heavy' };
    // coche (Aguirra): arranca despacio, acelera, y si se estampa contra el rival se para en seco y rebota
    if (s.drive) return { pose: 'sp2', st: 6, ac: 30, rc: 16, dmg: s.dmg, band: [0.15, 0.95], push: 12, kd: true, vx: s.vx * 1.45, drive: true, special: true, sfx: 'heavy' };
    if (s.type === 'spin') return { pose: 'sp2', st: 5, ac: 44, rc: 11, dmg: s.dmg, band: [0.1, 0.95], push: 7, stun: 16, multi: 11, both: true, vx: s.vx, special: true, sfx: 'hit' };
    return { pose: 'sp2', st: 7, ac: 18, rc: 14, dmg: s.dmg, band: [0.15, 0.95], push: 10, kd: true, vx: s.vx * 1.25, lift: s.air || 0, special: true, sfx: 'heavy' };
  }

  // ---------- Alianzas ----------
  // afines: los aliados "naturales" de un luchador (su lista allies o, si no tiene, los de su bloque)
  const affine = (f, d) => BASEF(d) !== BASEF(f) && (f.allies ? f.allies.includes(d.id) || f.allies.includes(BASEF(d).id) : d.bloc === f.bloc);
  // ¿puede el jugador elegir a d como aliado de f? (GAME_CONFIG.alianzasLibres permite cualquier pacto)
  const canAlly = (f, d) => BASEF(d) !== BASEF(f) && (CFG.alianzasLibres || affine(f, d));
  function cpuAlly(f, opp) {
    let c = FIGHTERS.filter(d => affine(f, d) && Unlock.has(d)); const notOpp = c.filter(d => d.id !== opp.id); if (notOpp.length) c = notOpp;
    return c[Math.floor(Math.random() * c.length)] || null;
  }
  const pactOf = (a, b) => [a.ideologia, b.ideologia].sort().join(' + ');

  // ---------- RASGOS: la mecánica propia de cada personaje (se asignan en data.js, window.RASGO_DE) ----------
  const RASGOS = {
    resistencia: { n: 'MANUAL DE RESISTENCIA', d: 'Una vez por combate aguanta un K.O. con un hilo de vida' },
    contragolpe: { n: 'NO ME CONSTA', d: 'Al cubrirse, a veces devuelve el golpe y deja al rival aturdido' },
    remontada: { n: 'REMONTADA', d: 'Con poca vida pega un 35 % más fuerte' },
    impasible: { n: 'IMPASIBLE', d: 'Los golpes normales no lo tumban y le quitan menos' },
    maletero: { n: 'AL MALETERO', d: 'Al cubrirse, a veces lanza una bomba de humo y reaparece a la espalda del rival' },
    sobres: { n: 'LLUEVEN SOBRES', d: 'Cuando le pegan se le caen sobres: quien los coge llena el súper' },
    recaudador: { n: 'AFÁN RECAUDATORIO', d: 'Cada golpe que da le roba barra de súper al rival' },
    bulo: { n: 'BULO VIRAL', d: 'Sus golpes a veces invierten los controles del rival' },
    talante: { n: 'TALANTE', d: 'Si no le pegan en un rato, recupera vida poco a poco' },
    chupoptero: { n: 'CHUPÓPTERO', d: 'Se cura con parte del daño que hace' },
  };
  const RASGO_LISTA = Object.keys(RASGOS);
  function rasgoDe(def) {
    if (CFG.rasgos === false) return null;
    const R = window.RASGO_DE || {}, b = BASEF(def), r = R[def.id] || R[b.id];
    if (RASGOS[r]) return r;
    let h = 0; for (const c of b.id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return RASGO_LISTA[h % RASGO_LISTA.length]; // sin asignar: uno fijo según el nombre
  }

  // ---------- Luchador ----------
  class Fighter {
    constructor(def, x, dir, cpu, level) {
      this.def = def; this.id = def.id; this.m = META[def.id]; this.k = def.height / this.m.idle.h;
      this.x = x; this.y = GROUND; this.vx = 0; this.vy = 0; this.dir = dir; this.cpu = cpu; this.level = level || 0;
      this.maxHp = def.hp; this.hp = this.maxHp; this.lag = this.hp; this.meter = 0; this.wins = 0; this.rasgo = rasgoDe(def); if (this.rasgo === 'maletero') { humoIm('pimen_humo1'); humoIm('pimen_humo4'); } // la bomba de humo, cargada de antemano
      this.state = 'idle'; this.t = 0; this.move = null; this.hitDone = false; this.guard = false; this.invul = 0; this.flash = 0;
      this.ai = { cool: 30, moveT: 0, moveDir: 0, blockT: 0, jumpAtk: false };
      this.hw = (def.wide ? 0.34 : 0.17) * def.height;
      this.runFrames = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'].filter(p => this.m[p]); this.sp2Frames = ['sp2a', 'sp2b', 'sp2c', 'sp2d'].filter(p => this.m[p]); this.trail = []; this.land = 0; this.assistCd = 0;
      const wf = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'].filter(p => this.m[p]);
      this.walkFrames = wf.length >= 4 ? wf : wf.length === 3 ? [wf[0], wf[1], wf[2], wf[1]] : ['idle', 'walk'];
      this.lastPose = this.prevPose = 'idle'; this.poseT = 9;
      this.buf = {}; this.hist = []; this.pd = {}; this.raw = {}; this.comboN = 0; this.juggle = 0; this.chain = 0;
    }
    reset(x, dir) { Object.assign(this, { x, y: GROUND, vx: 0, vy: 0, dir, hp: this.maxHp, lag: this.maxHp, state: 'idle', t: 0, move: null, invul: 0, guard: false, superArmor: false, assistCd: 0, land: 0, trail: [], maletT: 0 }); }
    get grounded() { return this.y >= GROUND; }
    // con menos de media vida el personaje aparece magullado (poses *_x)
    get beaten() { return this.hp / this.maxHp < 0.5 && !!this.m.idle_x; }
    // ¿se puede usar esta pose? (si está magullado, solo si existe su versión magullada)
    ok(p) { return !!this.m[p] && (!this.beaten || !!this.m[p + '_x']); }
    get free() { return ['idle', 'walk', 'crouch'].includes(this.state); }
    get hh() { return this.def.height * (this.state === 'crouch' || this.state === 'getup' || (this.move && this.move.pose === 'low') ? 0.66 : (this.state === 'down' || this.state === 'dead' ? 0.25 : 1)); }
    set(state) {
      this.state = state; this.t = 0; this.superArmor = false; this.flyBack = false; if (state !== 'attack') this.move = null;
      if (state === 'idle' || state === 'down' || state === 'blockstun') { this.comboN = 0; this.juggle = 0; } // aquí termina el combo que estuviera recibiendo
    }
    // guarda las pulsaciones unos fotogramas (para que no se pierdan durante las pausas de impacto) y el historial de direcciones
    feed(r, frame) {
      for (const b of BTNS) if (r[b]) this.buf[b] = 8;
      for (const k of ['l', 'r', 'd', 'u']) { if (r[k] && !this.pd[k]) this.hist.push({ k, f: frame }); this.pd[k] = !!r[k]; }
      if (this.hist.length > 10) this.hist.splice(0, this.hist.length - 10); this.raw = r;
    }
    buffered() { const o = { l: this.raw.l, r: this.raw.r, u: this.raw.u, d: this.raw.d }; for (const b of BTNS) { o[b] = this.buf[b] > 0; if (this.buf[b] > 0) this.buf[b]--; } return o; }
    // ¿acaba el historial reciente con esta secuencia de direcciones? (F adelante, B atrás, D abajo)
    motion(pat, now) {
      const key = { F: this.dir === 1 ? 'r' : 'l', B: this.dir === 1 ? 'l' : 'r', D: 'd' }; let i = this.hist.length - 1;
      for (let p = pat.length - 1; p >= 0; p--) { while (i >= 0 && this.hist[i].k !== key[pat[p]]) i--; if (i < 0 || this.hist[i].f < now - 26) return false; i--; }
      return true;
    }
    // movimiento por comando que pide el jugador en este fotograma, o null
    command(inp, G) {
      if (!this.hist.length || !(inp.punch || inp.kick)) return null; const now = G.frame || 0; let c = null;
      const free = !G.projs.some(p => p.owner === this);
      if (inp.punch) c = this.motion('FDF', now) ? 'gancho' : this.motion('DD', now) && this.meter >= 100 && !G.sup && !G.freeze ? 'super' : this.motion('BF', now) ? 'cargado' : this.motion('DB', now) && free ? 'antiaereo' : this.motion('DF', now) && free ? 'sp1' : null;
      else c = this.motion('DF', now) ? 'slide' : this.motion('DB', now) || this.motion('BF', now) ? 'sp2' : null;
      if (c && ESTILO === 'puno' && SOLO_PUNO.has(c)) c = null;
      if (c) this.hist = []; return c;
    }
    // siguiente acción pedida (comando o botón), para encadenar combos
    next(inp, G) {
      const c = this.command(inp, G); if (c) return { name: c, ex: true };
      if (inp.super && this.meter >= 100 && !G.sup && !G.freeze) return { name: 'super' };
      if (inp.sp1 && !G.projs.some(p => p.owner === this)) return { name: 'sp1' };
      if (inp.sp2) return { name: 'sp2' };
      if (inp.kick) return { name: inp.d ? 'low' : 'kick' }; if (inp.punch) return { name: inp.d ? 'low' : 'punch' };
      return null;
    }
    start(name, G, ex) {
      this.move = moveOf(this, name); this.moveName = name; this.state = 'attack'; this.t = 0; this.hitDone = false; this.vx = 0;
      (this.usos || (this.usos = {}))[name] = (this.usos[name] || 0) + 1; // para los logros («gana solo con patadas»)
      this.buf = {}; this.connected = false; this.chain = 0; this.ex = !!ex; this.crashT = 0;
      if (this.move.drive) { this.pitch = 0; Sound.play('motor'); } // ex: hecho con comando, pega un 15 % más
      if (name === 'super') { this.meter = 0; this.superArmor = true; G.superFreeze(this); }
      else if (EXTRA[name]) { Sound.play('special'); G.callout(this, EXTRA[name]); if (name === 'gancho') this.invul = 7; this.meter = Math.min(100, this.meter + 4); }
      else if (name === 'sp1' || name === 'sp2') { Sound.play('special'); if (this.move.falcon) G.jet = { x: this.x - this.dir * 1000, y: 150, dir: this.dir, t: 0 }; G.callout(this, this.def[name].name + (ex ? ' +' : '')); this.meter = Math.min(100, this.meter + 4); }
      else Sound.play('whoosh');
    }
    reach(pose) { const m = this.m[pose] || this.m.punch; return Math.max(70, (m.w - m.ax) * this.k); }
    get spd() { return this.def.speed * (this.cabreo > 0 ? CABREO_VEL : 1); }
    // A PUÑO LIMPIO: el botón de súper activa el CABREO (más rápido y más daño unos segundos) y no hay especiales, apoyos ni objetos
    cabreoInput(inp, G) {
      if (this.cabreo > 0) this.cabreo--;
      if (inp.super && this.meter >= 100 && !(this.cabreo > 0) && ['idle', 'walk', 'crouch'].includes(this.state) && !G.freeze) {
        this.cabreo = CABREO_T; this.meter = 0; G.callout(this, '¡CABREO!'); Sound.play('super'); G.shake = Math.max(G.shake, 8); G.flashT = Math.max(G.flashT, 3);
        if (window.SF_VFX && SF_VFX.hex) G.sfx('poison', this.x, GROUND, { kind: 'aura', colors: CABREO_COL.map(SF_VFX.hex) }, null, this, CABREO_T);
      }
      return Object.assign({}, inp, { sp1: false, sp2: false, super: false, assist: false });
    }
    update(inp, opp, G) {
      if (ESTILO === 'puno') inp = this.cabreoInput(inp, G);
      this.t++; if (this.invul > 0) this.invul--; if (this.wakeT > 0) this.wakeT--; if (this.flash > 0) this.flash--; if (this.land > 0) this.land--; if (this.assistCd > 0) this.assistCd--;
      if (this.lag > this.hp) this.lag = Math.max(this.hp, this.lag - 0.35);
      const back = this.dir === 1 ? inp.l : inp.r;
      const tap = inp.r && !this.pR ? 1 : inp.l && !this.pL ? -1 : 0; this.pL = inp.l; this.pR = inp.r; this.tapT = (this.tapT || 0) + 1;
      this.guard = back && this.grounded;
      if (this.maletT > 0) { if (--this.maletT === 0) Sound.play('whoosh'); this.vx = 0; this.guard = false; return; } // dentro del maletero: ni se ve ni se mueve
      switch (this.state) {
        case 'idle': case 'walk': case 'crouch': {
          this.dir = opp.x >= this.x ? 1 : -1;
          // doble toque de dirección: carrera corta (hacia delante o hacia atrás)
          if (tap) { if (this.tapDir === tap && this.tapT < 14) { this.tapDir = 0; this.dashDir = tap; this.set('dash'); Sound.play('whoosh'); break; } this.tapDir = tap; this.tapT = 0; }
          { const cm = this.command(inp, G); if (cm) { this.start(cm, G, true); break; } }
          if (inp.assist && inp.d && G.canTag(this)) { this.buf.assist = 0; G.tag(this); break; } // abajo + ALIADO: cambio de luchador (como en Marvel vs Capcom)
          if (inp.assist && !inp.d && this.assistCd <= 0) { G.callAssist(this, opp); this.buf.assist = 0; }
          if (inp.super && this.meter >= 100 && !G.sup && !G.freeze) this.start('super', G);
          else if (inp.sp1 && !G.projs.some(p => p.owner === this)) this.start('sp1', G);
          else if (inp.sp2) this.start('sp2', G);
          else if (inp.punch && inp.d && ESTILO !== 'puno' && G.propNear(this)) { this.cogido = G.propNear(this); this.start('throw', G); } // se agacha, lo coge y lo lanza de un solo gesto: nunca lo lleva encima
          else if (inp.punch) this.start(inp.d ? 'low' : 'punch', G);
          else if (inp.kick) this.start(inp.d ? 'low' : 'kick', G);
          else if (inp.u) { this.jvx = (inp.r - inp.l) * this.spd * MOVE * 1.1; this.vx *= 0.4; this.set('prejump'); }
          else if (inp.d) { this.vx = 0; if (this.state !== 'crouch') this.set('crouch'); }
          else {
            const mv = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
            this.vx = mv * this.spd * MOVE * (mv === this.dir ? 1 : 0.85);
            const ns = mv ? 'walk' : 'idle'; if (this.state !== ns) this.set(ns);
          }
          break;
        }
        case 'dash': {
          const fwd = this.dashDir === this.dir, len = fwd ? 11 : 13;
          this.vx = this.dashDir * this.spd * MOVE * DASH * (this.t < len - 4 ? 1 : 0.45);
          if (this.t >= len) this.set('idle');
          else if (fwd && this.t >= 5) { if (inp.punch) this.start(inp.d ? 'low' : 'punch', G); else if (inp.kick) this.start(inp.d ? 'low' : 'kick', G); else if (inp.sp2) this.start('sp2', G); }
          break;
        }
        case 'pulsa': this.vx *= 0.6; if (this.t >= 34) this.set('idle'); break; // pulsando el botón rojo (MODO CAOS)
        case 'prejump': // tres fotogramas de flexión antes de despegar
          if (this.t >= 3) { this.vy = JUMP; this.vx = this.jvx; this.y -= 1; this.set('jump'); Sound.play('jump'); }
          break;
        case 'jump':
          // en el aire se gira hacia el rival (también al saltar por encima) hasta que lanza el ataque
          if (!this.move) this.dir = opp.x >= this.x ? 1 : -1;
          if ((inp.punch || inp.kick) && !this.move) { this.moveName = inp.kick || !this.m.airp ? 'air' : 'airp'; this.move = BASE[this.moveName]; if (inp.punch && !inp.kick) (this.usos || (this.usos = {})).airp = 1; this.buf = {}; this.connected = false; this.hitDone = false; this.mt = 0; Sound.play('whoosh'); }
          if (this.move) this.mt++;
          break;
        case 'attack': {
          const mv = this.move, t = this.t;
          if (this.connected && t > mv.st && LV[this.moveName]) { // cancelación de combo
            const nx = this.next(inp, G);
            if (nx && canCancel(this.moveName, nx.name, this.chain)) {
              const ch = LV[this.moveName] <= 2 && LV[nx.name] <= 2 ? this.chain + 1 : 0; this.y = Math.min(this.y, GROUND);
              if (this.grounded || nx.name === 'super') { this.y = GROUND; this.vy = 0; this.start(nx.name, G, nx.ex); this.chain = ch; if (LV[nx.name] < 3) this.vx = this.dir * 7; break; }
            }
          }
          if (this.moveName === 'super') { if (t === mv.st) G.superFire(this, opp); }
          else if (this.moveName === 'throw') { if (t === 7 && this.cogido) { this.held = G.takeProp(this.cogido); this.cogido = null; G.callout(this, '¡' + (PROP_NOMBRE[this.held] || this.held).toUpperCase() + '!'); } if (t === mv.st && this.held) { G.throwProp(this); this.held = null; } }
          else if (mv.proj && t === mv.st) G.spawnProj(this);
          else if (mv.falcon) this.falconStep(t - mv.st, mv, G);
          else if (mv.drive && t > mv.st) this.driveStep(t - mv.st, mv, G);
          else if (mv.vx && t > mv.st && t <= mv.st + mv.ac) {
            this.vx = this.dir * mv.vx;
            if (mv.upper && t === mv.st + 1) { this.vy = -21; this.y -= 1; }
            if (mv.lift) this.y = GROUND - mv.lift * Math.sin(Math.PI * (t - mv.st) / mv.ac);
            if (mv.multi && (t - mv.st) % mv.multi === 0) this.hitDone = false;
          } else { if (mv.lift && t > mv.st + mv.ac) this.y = GROUND; if (this.grounded) this.vx *= 0.7; }
          if (t >= mv.st + mv.ac + mv.rc && this.grounded && !(mv.drive && this.crashT && this.crashT < 34)) { this.y = GROUND; this.set('idle'); } // estampada se queda un rato en el coche
          break;
        }
        case 'hit': case 'blockstun': this.vx *= 0.86; if (this.t >= this.stunT) this.set('idle'); break;
        case 'fall': break;
        case 'down': this.vx *= 0.8; if (this.t > 26) { if (this.hp > 0) { this.set('getup'); this.invul = 20; this.wakeT = 20; } else this.set('dead'); } break;
        case 'getup': this.vx = 0; if (this.t > 9) this.set('idle'); break;
        case 'win': case 'dead': case 'dizzy': case 'fatal': this.vx *= 0.8; break;
      }
      // física
      if (!this.grounded || this.vy < 0) {
        if (!(this.move && (this.move.lift || this.move.falcon))) { this.vy += GRAV; this.y += this.vy; }
        if (this.y >= GROUND) {
          this.y = GROUND; this.vy = 0;
          if (this.state === 'fall') { this.set('down'); this.vx *= 0.5; G.shake = 8; Sound.play('fall'); }
          else if (this.state === 'jump') { this.vx = 0; this.set('idle'); this.land = 8; }
        }
      }
      this.x = clamp(this.x + this.vx, Math.max(G.camX + 55, 150), Math.min(G.camX + W - 55, STAGE_W - 150)); // en los extremos del escenario, margen para que no salga cortado
      this.x = clamp(this.x, 60, STAGE_W - 60);
      // estela para movimientos rápidos
      const fast = (this.state === 'attack' && (this.moveName === 'sp2' || this.moveName === 'super') && this.t > this.move.st) || this.state === 'fall' || this.state === 'dash';
      // líneas de velocidad (no la estela de copias, que Gastón no quiere en los golpes normales): también en saltos y golpes mientras salen
      this.fastNow = this.state === 'dash' && this.t >= 4; // Gastón (13-nov): solo al correr, y cuando ya va lanzado (no al arrancar)
      if (fast && this.t % 2 === 0) this.trail.push({ x: this.x, y: this.y, p: this.pose(), dir: this.dir });
      if (this.trail.length > 5 || (!fast && this.trail.length)) this.trail.shift();
      if (!fast && this.def.sp2.drive) this.trail.length = 0; // el coche no deja estela al frenar
    }
    // coche: aceleración progresiva (morro arriba), frenada derrapando al final (morro abajo) y, si toca al rival, choque:
    // se para en seco, rebota un poco hacia atrás, humo y chispas, y el coche se queda abollado hasta que acaba el movimiento
    driveStep(u, mv, G) {
      if (this.hitDone && !this.crashT) {
        this.crashT = 1; Sound.play('choque'); G.shake = Math.max(G.shake || 0, 12);
        G.spark(this.x + this.dir * 150, GROUND - 90, '#fff', 14); G.spark(this.x + this.dir * 120, GROUND - 40, '#ffb347', 10);
      }
      let aim;
      if (this.crashT) { this.crashT++; this.vx = -this.dir * Math.max(0, 7 - this.crashT * 0.6); aim = this.crashT < 5 ? -0.09 : 0; }
      else if (u <= mv.ac) { const a = Math.min(1, u / 16); this.vx = this.dir * mv.vx * (0.1 + 0.9 * a * a); aim = u < 16 ? 0.06 * (1 - a * 0.6) : 0.012; }
      else { this.vx *= 0.8; aim = Math.abs(this.vx) > 2 ? -0.05 : 0; }
      this.pitch += (aim - this.pitch) * 0.3;
      this.wheelA = (this.wheelA || 0) + (this.crashT ? 0 : Math.abs(this.vx) * 0.09);
    }
    // geometría del coche para una pose: puntos de apoyo de las ruedas (relativos al ancla, ya volteados) y cuánto hay que bajarlo
    carGeom(p) {
      const W = this.def.sp2.wheels; if (!W) return null;
      const key = this.beaten && this.m[p + '_x'] ? p + '_x' : p, wl = W[key], m = this.m[key], im = IMG[this.id + '/' + key];
      if (!wl || !m || !im || !im.naturalWidth) return null;
      const f = m.w / im.naturalWidth, K = this.k, d = this.dir;
      const contacts = wl.map(([cx, cy, r]) => [(cx * f - m.ax) * K * d, -(m.h - (cy + r) * f) * K]);
      const drop = -Math.max(contacts[0][1], contacts[1][1]);   // la rueda más baja (la delantera) toca el suelo
      return { contacts: contacts.map(([x, y]) => [x, y + drop]), drop, r: wl[1][2] * f * K, span: [-m.ax * K * d, (m.w - m.ax) * K * d] };
    }
    // coche estampado: humo saliendo del motor, piezas que saltan al principio y estrellas girando sobre la cabeza (en píxeles)
    drawCrash(sx, mm) {
      const K = this.k, d = this.dir, ct = this.crashT, R = Math.round;
      const ex = sx + d * (mm.w - mm.ax) * K * 0.8, ey = this.y - mm.h * K * 0.3;
      for (let i = 0; i < 7; i++) {
        const age = (ct * 1.3 + i * 6) % 42, r = 9 + age * 0.75, x = ex - d * age * 0.6 + Math.sin(age * 0.3 + i) * 6, y = ey - age * 2.6;
        const a = (0.85 * (1 - age / 42)).toFixed(2), g = i % 2 ? '150,150,158' : '215,215,222';
        ctx.fillStyle = `rgba(${g},${a})`; ctx.fillRect(R(x - r), R(y - r), R(r * 2), R(r * 2)); ctx.fillRect(R(x - r * 0.6), R(y - r * 1.3), R(r * 1.2), R(r * 2.6));
      }
      if (ct < 28) for (let i = 0; i < 7; i++) {
        const vx = d * (2.5 + (i % 3) * 2.2) * (i % 4 === 0 ? -0.5 : 1), vy = -10 + i * 1.2, x = ex + vx * ct, y = ey + vy * ct + 0.6 * ct * ct;
        if (y < GROUND) { ctx.fillStyle = i % 3 ? '#d8d6de' : '#5a5560'; ctx.fillRect(R(x), R(y), i % 2 ? 7 : 4, i % 2 ? 4 : 7); }
      }
      const hy = this.y - mm.h * K * 0.97;
      for (let i = 0; i < 3; i++) {
        const ang = ct * 0.18 + i * 2.09, x = R(sx + Math.cos(ang) * 40), y = R(hy + Math.sin(ang) * 10);
        ctx.fillStyle = '#ffe14a'; ctx.fillRect(x - 1, y - 6, 3, 13); ctx.fillRect(x - 6, y - 1, 13, 3);
      }
    }
    // despega, vuela hacia el rival, puñetazo en el aire, frena y vuelve flotando de espaldas a su sitio
    falconStep(u, mv, G) {
      const OUT = 18, HIT = 10, BACK = 18, HGT = 110, own = !!this.m.fa6;
      if (u <= 0) { this.fx0 = this.x; this.vx = 0; }
      else if (u <= OUT) { this.vx = this.dir * mv.vx * Math.min(1, u / 4); this.y = GROUND - HGT * Math.min(1, u / 8); this.hitDone = true; }
      else if (u <= OUT + HIT) {
        this.vx = this.dir * 2; this.y = GROUND - HGT;
        if (u === OUT + 1) { this.hitDone = false; Sound.play('whoosh'); G.spark(this.x + this.dir * this.reach('fa5') * 0.9, this.y - this.def.height * 0.45, '#bfe6ff', 12); G.shake = Math.max(G.shake, 5); }
      }
      else if (u <= OUT + HIT + BACK) { const left = OUT + HIT + BACK - u + 1; this.vx = (this.fx0 - this.x) / left; this.y = GROUND - HGT * Math.min(1, (left - 1) / 9); this.hitDone = true; this.flyBack = !own; }
      else { if (u === OUT + HIT + BACK + 1) { G.shake = Math.max(G.shake, 6); Sound.play('heavy'); this.land = 0; } this.vx = 0; this.y = GROUND; this.flyBack = false; }
    }
    active() {
      const mv = this.move; if (!mv || mv.proj || this.moveName === 'super' || this.hitDone) return null;
      if (mv.falcon) { const u = this.t - mv.st; if (u <= 18 || u > 28) return null; const r = this.reach(this.m.fa5 ? 'fa5' : 'punch'), hh = this.def.height; return { x0: this.dir === 1 ? this.x - 10 : this.x - r, x1: this.dir === 1 ? this.x + r : this.x + 10, y0: this.y - hh * mv.band[1], y1: this.y - hh * mv.band[0] }; }
      const t = this.state === 'jump' ? this.mt : this.t;
      if (t <= mv.st || t > mv.st + mv.ac) return null;
      const r = this.reach(mv.pose), hh = this.def.height;
      const x0 = mv.both ? this.x - r : (this.dir === 1 ? this.x - 10 : this.x - r), x1 = mv.both ? this.x + r : (this.dir === 1 ? this.x + r : this.x + 10);
      return { x0, x1, y0: this.y - hh * mv.band[1], y1: this.y - hh * mv.band[0] };
    }
    hurt() { return { x0: this.x - this.hw, x1: this.x + this.hw, y0: this.y - this.hh, y1: this.y }; }
    attackPose() {
      const mv = this.move, t = this.t, n = this.moveName, m = this.m, end = mv.st + mv.ac, or = (...ps) => ps.find(p => m[p]) || mv.pose;
      if (n === 'punch') return t <= 2 ? or('punch0') : t <= mv.st ? or('pm', 'punch0') : t <= end + 2 ? 'punch' : t <= end + 6 ? or('pr') : 'idle';
      if (n === 'kick') return t <= 3 ? or('kick0') : t <= mv.st ? or('km', 'kick0') : t <= end + 2 ? 'kick' : t <= end + 8 ? or('kr') : 'idle';
      if (n === 'gancho') return t <= mv.st ? or('pm', 'punch0') : !this.grounded ? (this.vy < 0 && m.jumpup ? 'jumpup' : 'jump') : (m.land ? 'land' : 'crouch');
      if (n === 'low') return t <= mv.st - 3 ? or('low0') : t <= mv.st ? or('low1', 'low0') : t <= end + 4 ? 'low' : t <= end + 8 ? or('low1', 'low') : 'crouch';
      if (n === 'throw') return t < 7 ? or('crouch0', 'crouch') : t < mv.st ? or('punch0', 'pm') : t <= end + 3 ? 'punch' : or('pr', 'punch');
      if (n === 'sp1' || n === 'antiaereo') {
        // con el objeto en la mano solo hasta soltarlo: desde que sale volando, la mano vacía (si no, se ve el objeto dos veces)
        if (mv.proj && t >= mv.st) return t <= end + 3 ? or('punch', 'pr') : or('pr', 'th4', 'punch');
        if (m.th2) return t < mv.st - 3 ? or('th1', 'sp1w') : 'th2';
        return t < mv.st - 3 ? or('sp1w') : 'sp1';
      }
      if (n === 'super') {
        if (this.def.super.kombo && m.k8) return t <= mv.st ? 'k1' : this.kpose || 'k1'; // agarre propio: la pose la decide komboStep
        if (this.def.super.familia === 'sismo' && CFG.superFamilias !== false) { const u = t - mv.st; return u <= 0 ? or('superc') : u < 16 ? or('jumpup', 'jump') : u < 46 ? or('land', 'crouch') : 'super'; } // terremoto: salta y cae a plomo contra el suelo
        const G = GUION(this.def.id), gs = G && G.super ? ['gs1', 'gs2', 'gs3', 'gs4'].filter(p => m[p]) : [];
        if (gs.length >= 3) return gs[Math.min(gs.length - 1, Math.floor(t / (G.super.ritmo || 30)))]; // súper propio: sus 4 dibujos, uno tras otro
        const sv =this.svFrames || (this.svFrames = Array.from({ length: 16 }, (_, i) => 'sv' + (i + 1)).filter(p => m[p]));
        if (sv.length >= 4) { // súper sacado de vídeo: la secuencia se reproduce entera una vez y se queda en la pose final respirando
          return sv[Math.min(sv.length - 1, Math.floor(t / 4))]; // nada de alternar: al acabar se queda en la pose final
        }
        return t <= mv.st ? or('superc') : 'super'; // sin secuencia: carga y se queda en la pose (nada de alternar dos dibujos)
      }
      if (n === 'sp2') {
        if (mv.falcon) {
          const u = t - mv.st; if (!m.fa5) return u > 18 && u <= 28 ? 'punch' : (m.sp2a ? 'sp2a' : 'sp2');
          return u <= 0 ? 'fa1' : u <= 5 ? 'fa2' : u <= 13 ? 'fa3' : u <= 18 ? 'fa4' : u <= 28 ? 'fa5' : u <= 34 ? 'fa6' : u <= 46 ? 'fa7' : 'fa8';
        }
        const F = this.sp2Frames; if (!F.length) return 'sp2';
        const gal = ['gal1', 'gal2', 'gal3', 'gal4', 'gal5', 'gal6', 'gal7', 'gal8'].filter(p => m[p]); // el caballo de Obiscal galopa de verdad
        if (gal.length >= 4) return gal[Math.floor(t / 3) % gal.length];
        // carga a pie: zancadas de verdad, salvo quien va en vehículo o empujando con su objeto
        if (this.def.sp2.type === 'rush' && !mv.upper && this.runFrames.length >= 6 && !CARGA_CON_OBJETO.has(this.def.id)) return this.runFrames[Math.floor(t / 3) % this.runFrames.length];
        // un solo dibujo durante toda la carrera (y otro al frenar) para que no dé saltos al cambiar de fotograma (el coche de Aguirra)
        const fixed = this.def.sp2.frames && this.def.sp2.frames.filter(p => m[p]);
        if (fixed && fixed.length) return this.crashT && m.sp2crash ? 'sp2crash' : t > mv.st + mv.ac && fixed[1] ? fixed[1] : fixed[0];
        if (t <= mv.st) return F[0];
        if (this.def.sp2.anim === 'once' || mv.upper) return F[Math.min(F.length - 1, Math.floor((t - mv.st) / mv.ac * F.length))];
        return F[Math.floor((t - mv.st) / (this.def.sp2.step || 4)) % F.length];
      }
      return mv.pose;
    }
    pose() {
      const m = this.m;
      if (this.agarre) return this.agarre; // lo tiene agarrado el rival (súper de agarre): pose fija
      switch (this.state) {
        case 'walk': {
          const atras = this.vx * this.dir < 0, nuevos = (atras ? ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8'] : ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']).filter(p => this.ok(p));
          if (nuevos.length >= 6) return nuevos[Math.floor(this.t / clamp(Math.round(this.def.height * 0.1 / Math.max(1, Math.abs(this.vx))), 3, 8)) % nuevos.length]; // el paso va al ritmo de la velocidad: los pies no patinan
          let wf = this.walkFrames.filter(p => this.ok(p)); if (wf.length < 3) wf = ['idle', 'walk'];
          // un ciclo completo dura unos 48 fotogramas, tenga los pasos que tenga
          const i = Math.floor(this.t / Math.max(3, Math.round(30 / wf.length))) % wf.length;
          return wf[this.vx * this.dir < 0 ? wf.length - 1 - i : i]; // andando hacia atrás el ciclo va al revés
        }
        case 'dash': { if (this.runFrames.length >= 6) return this.runFrames[Math.floor(this.t / 2) % this.runFrames.length]; const wf = this.walkFrames.filter(p => this.ok(p)); return wf.length ? wf[Math.floor(this.t / 3) % wf.length] : 'walk'; }
        case 'pulsa': { const t = this.t; if (this.pulsaPisa) return t < 5 ? 'b6' : t < 14 ? 'b7' : 'b8'; return t < 5 ? 'b1' : t < 11 ? 'b2' : t < 18 ? 'b3' : t < 26 ? 'b4' : 'b8'; }
        case 'prejump': return this.ok('jp1') ? 'jp1' : this.ok('crouch0') ? 'crouch0' : 'crouch';
        case 'crouch': return this.t < 4 && this.ok('crouch0') ? 'crouch0' : 'crouch';
        case 'getup': return this.ok('getup') ? 'getup' : 'crouch';
        case 'jump': {
          if (!this.move) {
            if (this.ok('jp2') && this.ok('jp4')) return this.vy < -7 ? 'jp2' : this.vy < 6 ? (this.ok('jp3') ? 'jp3' : 'jump') : 'jp4'; // despegue, cumbre encogido y caída
            return this.vy < -9 && this.ok('jumpup') ? 'jumpup' : 'jump';
          }
          const mv = this.move, a = this.ok(mv.pose) ? mv.pose : 'air';
          return this.mt <= mv.st && this.ok('air0') ? 'air0' : this.mt > mv.st + mv.ac && this.ok('airr') ? 'airr' : a;
        }
        case 'attack': return this.attackPose();
        case 'hit': {
          if (this.ok('ht1') && this.ok('ht2') && this.ok('ht3') && this.hitPose !== 'hit2') {
            return this.t < 3 ? 'ht1' : this.t < 7 ? 'ht2' : 'ht3'; // el 4.º dibujo (vuelta a la guardia) no se usa: la IA lo suele dibujar con objetos o de brazos cruzados
          }
          return this.hitPose && this.ok(this.hitPose) ? this.hitPose : 'hit';
        }
        case 'dizzy': if (this.fpose) return this.fpose;
          return this.ok('hit2') && Math.floor(this.t / 22) % 2 ? 'hit2' : 'hit';
        case 'fatal': return this.fpose || 'idle';
        case 'blockstun': return this.t < 3 && this.ok('block0') ? 'block0' : 'block';
        case 'fall': return this.vy < -3 ? 'hit' : (this.ok('fall') ? 'fall' : 'ko');
        case 'down': case 'dead': return 'ko';
        case 'win': if (this.def.baile && m.y8 && this.hp >= this.maxHp * 0.6) return 'y' + (1 + Math.floor(this.t / 7) % 8); // Trump gorra roja con mucha vida: baila como en los mítines (Gastón, 13-nov), 8 dibujos propios
          return 'win'; // una sola pose respirando: alternar dos dibujos distintos se ve como un salto
        default: {
          if (this.land > 2) return this.ok('jp1') ? 'jp1' : this.ok('land') ? 'land' : 'idle';
          const fuera = IB_PIERNAS[this.id] || [], ib = ['ib1', 'ib2', 'ib3', 'ib4'].filter(p => this.ok(p) && m[p].h > m.idle.h * 0.92 && !fuera.includes(p)); // fuera los dibujos agachados de más (la guardia no debe dar botes) y los que dan un paso (parecía que bailaba)
          this.ibSeq = ib.length >= 3;
          if (ib.length >= 3) { const seq = ib.concat(ib.slice(1, -1).reverse()); return seq[Math.floor(this.t / 9) % seq.length]; } // vaivén: 1-2-3-4-3-2
          return 'idle';
        }
      }
    }
    drawPose(p, sx, y, dir, kx, ky, alpha, bright, rot) {
      if (!this.m[p]) p = 'idle';
      // una secuencia (súper, remate) va entera limpia o entera magullada: si no, parpadea al mezclar dibujos
      const fam = /^sv\d/.test(p) ? 'sv' : /^m\d$/.test(p) ? 'm' : /^r\d$/.test(p) ? 'r' : /^p\d$/.test(p) ? 'p' : /^o\d$/.test(p) ? 'o' : null;
      const entera = !fam || (this.famX || (this.famX = {}))[fam] !== undefined ? (fam ? this.famX[fam] : true) : (this.famX[fam] = Object.keys(this.m).filter(q => new RegExp('^' + fam + '\\d+$').test(q)).every(q => this.m[q + '_x']));
      if (this.beaten && entera && this.m[p + '_x']) p += '_x';
      const listo = q => { const i = IMG[this.id + '/' + q]; return i && i.complete && i.naturalWidth && this.m[q] ? i : null; };
      // si el dibujo aún no ha cargado (móvil con mala conexión) se usa el limpio o el último que se pintó: el luchador nunca se queda invisible
      if (!listo(p)) { const q = [p.replace(/_x$/, ''), this.okPose, 'idle'].find(q => q && listo(q)); if (!q) return; p = q; }
      const m = this.m[p], im = listo(p); if (alpha == null) this.okPose = p;
      ctx.save(); ctx.translate(sx, y); if (rot) { const hy = m.h * this.k / 2; ctx.translate(0, -hy); ctx.rotate(rot); ctx.translate(0, hy); }
      ctx.scale(dir * this.k * kx, this.k * ky); if (alpha != null) ctx.globalAlpha = alpha;
      const parte = this.fat && this.fat.parte;
      // destello de golpe: copia ya aclarada del sprite (ver tinte); con ruedas o partido en dos se sigue usando el filtro
      const brillo = bright && !parte && !(this.state === 'attack' && this.moveName === 'sp2' && this.def.sp2.wheels) ? tinte(im, this.id + '/' + p + '|b24', 'brightness(2.4)') : null;
      if (bright && !brillo) ctx.filter = 'brightness(2.4)';
      if (parte) { // partido en dos (súper de agarre): cada mitad cae hacia su lado desde el centro, con el hueso asomando y sangre en la rotura
        const cx = m.w / 2 - m.ax, cy = -m.h * 0.45, A = parte;
        for (const sd of [-1, 1]) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(sd * A); ctx.translate(-cx, -cy); ctx.beginPath(); ctx.rect(sd < 0 ? -m.ax - 2 : cx, -m.h - 2, sd < 0 ? cx + m.ax + 2 : m.w, m.h + 4); ctx.clip(); ctx.drawImage(im, -m.ax, -m.h, m.w, m.h); ctx.restore(); }
        const q = 6, ket = SANGRE === 'ketchup'; if (sangreVer()) { ctx.fillStyle = ket ? '#c4260f' : '#7d0a12'; ctx.fillRect(cx - 3 * q, cy - 2 * q, 6 * q, 4 * q);
        ctx.fillStyle = ket ? '#ff3d1f' : '#c0101e'; ctx.fillRect(cx - 2 * q, cy - 3 * q, 4 * q, 3 * q); ctx.fillStyle = '#efe6cf'; ctx.fillRect(cx - q, cy - 6 * q, 2 * q, 4 * q); ctx.fillRect(cx - 2 * q, cy - 7 * q, 4 * q, 2 * q); ctx.fillStyle = '#b8ab8a'; ctx.fillRect(cx, cy - 6 * q, q, 4 * q); }
      } else ctx.drawImage(brillo || (NOCHE ? tinte(im, this.id + '/' + p + '|noche', FNOCHE) : im), -m.ax, -m.h, m.w, m.h);
      const wl = alpha == null && this.state === 'attack' && this.moveName === 'sp2' && this.def.sp2.wheels && this.def.sp2.wheels[p];
      if (wl) {
        // cada rueda se recorta del propio sprite (círculo) y se vuelve a pintar girada según lo recorrido
        const f = m.w / im.naturalWidth; this.wc = this.wc || {};
        wl.forEach(([cx, cy, r], i) => {
          const key = p + i; let c = this.wc[key];
          if (!c) { c = this.wc[key] = document.createElement('canvas'); c.width = c.height = Math.ceil(r * 2); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.beginPath(); g.arc(r, r, r, 0, 7); g.clip(); g.drawImage(im, cx - r, cy - r, r * 2, r * 2, 0, 0, r * 2, r * 2); }
          ctx.save(); ctx.translate(-m.ax + cx * f, -m.h + cy * f); ctx.rotate(this.wheelA || 0); ctx.drawImage(c, -r * f, -r * f, r * 2 * f, r * 2 * f); ctx.restore();
        });
      }
      ctx.restore();
    }
    // aura del CABREO, estilo anime: la silueta del luchador en tres capas de fuego que crecen hacia arriba y laten,
    // con lenguas de fuego que suben, rayas de energía y algún chispazo; se pinta a 1/4 y se amplía sin suavizar (pixel art)
    drawAura(p, sx, y, dir, kx, ky) {
      if (!this.m[p]) p = 'idle'; if (this.beaten && this.m[p + '_x']) p += '_x';
      const m = this.m[p], im = IMG[this.id + '/' + p]; if (!m || !im || !im.complete || !im.naturalWidth) return;
      const P = 4, q = this.k / P, T = (this.auraT = (this.auraT || 0) + 1), R = Math.round;
      const sw = m.w * q * kx, sh = m.h * q * ky, cw = Math.ceil(sw) + 34, ch = Math.ceil(sh) + 48, ox = R(cw / 2), oy = ch - 4;
      const A = AURA.a, B = AURA.b, C = AURA.c; for (const c of [A, B, C]) { c.width = cw; c.height = ch; }
      const a = A.getContext('2d'), b = B.getContext('2d'), c = C.getContext('2d'); a.imageSmoothingEnabled = b.imageSmoothingEnabled = c.imageSmoothingEnabled = false;
      // la silueta (máscara) una sola vez
      b.save(); b.translate(ox, oy); b.scale(dir * q * kx, q * ky); b.drawImage(im, -m.ax, -m.h, m.w, m.h); b.restore();
      b.globalCompositeOperation = 'source-in'; b.fillStyle = '#fff'; b.fillRect(0, 0, cw, ch); b.globalCompositeOperation = 'source-over';
      // cada capa: la silueta engordada (r) y arrastrada hacia arriba (up) con un vaivén que la hace ondear como una llama
      const capa = (r, up, col, alpha, fase) => {
        c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, cw, ch);
        for (let k = 0; k < 10; k++) { const an = k / 10 * Math.PI * 2; c.drawImage(B, R(Math.cos(an) * r), R(Math.sin(an) * r * 0.8)); }
        for (let d = 1; d <= up; d++) { const w = Math.max(0, r * (1 - d / (up + 1))); const wx = R(Math.sin(T * 0.3 + d * 0.7 + fase) * (1 + d * 0.12)); c.drawImage(B, wx - R(w), -d * 2); c.drawImage(B, wx + R(w), -d * 2); }
        // lenguas: huecos que suben y recortan el borde en picos
        c.globalCompositeOperation = 'destination-out';
        for (let x = 0; x < cw; x += 2) { const hgt = 3 + R(hash(x * 1.7 + fase) * 6), yy = ((T * (1.6 + hash(x) * 1.4) + hash(x * 3.3) * ch) % (ch + 20)) - 10; c.fillRect(x, R(ch - yy), 1 + (x % 4 === 0), hgt); }
        c.globalCompositeOperation = 'source-in'; c.fillStyle = col; c.fillRect(0, 0, cw, ch);
        a.globalAlpha = alpha; a.drawImage(C, 0, 0); a.globalAlpha = 1;
      };
      capa(6, 14, '#c4160d', 0.5, 0);
      capa(4, 10, '#ff6a14', 0.7, 2);
      capa(2, 5, '#ffd23c', 0.85, 4);
      // el cuerpo se recorta del aura: el fuego queda alrededor y por detrás, no tapando la cara
      a.globalCompositeOperation = 'destination-out'; a.globalAlpha = 0.85; a.drawImage(B, 0, 0); a.globalAlpha = 1; a.globalCompositeOperation = 'source-over';
      // lenguas de fuego: nacen dentro de la silueta y suben estrechándose (amarillo > naranja > rojo)
      const L = this.auraP || (this.auraP = []);
      for (let i = 0; i < 2; i++) L.push({ x: (Math.random() < 0.5 ? -1 : 1) * sw * (0.25 + Math.random() * 0.3), y: -sh * (0.1 + Math.random() * 0.8), v: 0.9 + Math.random() * 1.2, w: 2 + Math.floor(Math.random() * 3), l: 5 + Math.floor(Math.random() * 7), t: 0, life: 12 + Math.floor(Math.random() * 10) });
      for (const f of L) {
        f.t++; f.y -= f.v; const u = f.t / f.life, len = R(f.l * (1 - u * 0.4)), x = ox + dir * f.x;
        a.globalAlpha = 1 - u * 0.7; a.fillStyle = u < 0.35 ? '#fff0a0' : u < 0.7 ? '#ff9a2a' : '#e0301a';
        for (let j = 0; j < len; j++) { const w = Math.max(1, R(f.w * (1 - j / len))); a.fillRect(R(x - w / 2 + Math.sin((f.t + j) * 0.5) * 0.6), R(oy + f.y - j), w, 1); }
      }
      this.auraP = L.filter(f => f.t < f.life).slice(-90);
      // rayas de energía que suben por fuera del cuerpo
      a.globalAlpha = 0.85; a.fillStyle = '#fff6c8';
      for (let i = 0; i < 6; i++) { const u = ((T * 0.045 + hash(i * 3.1)) % 1), x = ox + (hash(i * 7.7) - 0.5) * sw * 1.5, y0 = oy - u * sh * 1.5; a.fillRect(R(x), R(y0), 1, R(4 + hash(i) * 6)); }
      // chispazo eléctrico de vez en cuando
      if (T % 9 < 2) { a.globalAlpha = 1; a.fillStyle = T % 2 ? '#d8f4ff' : '#7fd0ff'; let x = ox + (hash(T) - 0.5) * sw * 1.4, yy = oy - hash(T * 1.3) * sh * 1.2; for (let j = 0; j < 4; j++) { const nx = x + (hash(T + j) - 0.5) * 8, ny = yy + 3 + hash(T * 2 + j) * 4; const n = Math.max(Math.abs(nx - x), Math.abs(ny - yy)); for (let k = 0; k <= n; k++) a.fillRect(R(x + (nx - x) * k / n), R(yy + (ny - yy) * k / n), 1, 1); x = nx; yy = ny; } }
      a.globalAlpha = 1;
      const ini = Math.min(1, (CABREO_T - this.cabreo) / 10), fin = this.cabreo < 60 ? (Math.floor(this.cabreo / 3) % 2 ? 0.35 : 0.9) : 1, puls = 0.86 + 0.14 * Math.sin(T * 0.4);
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = ini * fin * puls;
      ctx.drawImage(A, R(sx - ox * P), R(y - oy * P), cw * P, ch * P); ctx.restore();
    }
    // líneas de velocidad estilo manga/recreativa (Gastón, 13-nov): salen del borde trasero de la silueta real del dibujo
    // (se lee la máscara del sprite una vez por pose) y se pintan en bloques de 3 px, detrás del luchador; el sprite no se toca
    drawSpeed(p, sx, y, dir) {
      if (!this.m[p]) p = 'idle'; if (this.beaten && this.m[p + '_x']) p += '_x';
      const m = this.m[p], im = IMG[this.id + '/' + p]; if (!m || !im || !im.complete || !im.naturalWidth) return;
      const key = this.id + '/' + p; let ex = VEL_EXT.get(key);
      if (!ex) {
        const W = Math.max(1, Math.round(m.w / 4)), H = Math.max(1, Math.round(m.h / 4)), c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d'); g.drawImage(im, 0, 0, W, H); let d; try { d = g.getImageData(0, 0, W, H).data; } catch (e) { VEL_EXT.set(key, []); return; }
        ex = []; for (let yy = 1; yy < H - 1; yy += 2) { let a = -1, b = -1; for (let xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3] > 128) { if (a < 0) a = xx; b = xx; } if (a >= 0) ex.push([yy * 4, a * 4, (b + 1) * 4]); }
        VEL_EXT.set(key, ex);
      }
      const dm = this.state === 'attack' ? this.dir : (Math.sign(this.vx) || this.dir), k = this.k, T = Math.floor(this.t / 2), R = Math.round, Q = 3;
      const spd = this.state === 'attack' ? 1 : Math.min(1.4, 0.4 + Math.abs(this.vx) / 8), sem = this.id.length * 7;
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#ffffff';
      for (let i = 0; i < ex.length; i++) {
        const h = (i * 73 + T * 31 + sem) % 11; if (h > 3) continue; // solo unas pocas filas, que cambian cada 2 fotogramas
        const [v, u0, u1] = ex[i], X0 = sx + dir * k * (u0 - m.ax), X1 = sx + dir * k * (u1 - m.ax);
        const ini = (dm > 0 ? Math.min(X0, X1) : Math.max(X0, X1)) + dm * 8, L = (40 + ((i * 37 + T * 13) % 9) * 14) * spd, Y = R((y + k * (v - m.h)) / Q) * Q;
        const a1 = ini - dm * L * 0.55, a2 = ini - dm * L;
        ctx.globalAlpha = 0.55; ctx.fillRect(R(Math.min(ini, a1) / Q) * Q, Y, R(L * 0.55 / Q) * Q, Q);
        ctx.globalAlpha = 0.25; ctx.fillRect(R(Math.min(a1, a2) / Q) * Q, Y, R(L * 0.45 / Q) * Q, Q);
      }
      ctx.restore();
    }
    draw(camX) {
      const sx = this.x - camX, air = GROUND - this.y, p = this.pose();
      // sombra centrada bajo los pies (con GROUND + 6 quedaba 8 px por debajo y los luchadores parecían flotar)
      ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.beginPath();
      const cg = this.carGeom(p);
      if (cg) {
        // coche en 3/4: la sombra pasa por debajo de las dos ruedas (la de atrás se ve más alta) en vez de ser una elipse plana
        // misma línea inclinada bajo las ruedas, pero a lo ancho de todo el coche (de parachoques a parachoques)
        const [[xa, ya], [xb, yb]] = cg.contacts, sl = (yb - ya) / (xb - xa), cx = (cg.span[0] + cg.span[1]) / 2;
        ctx.ellipse(sx + cx, this.y + ya + (cx - xa) * sl + 2, Math.abs(cg.span[1] - cg.span[0]) / 2, cg.r * 0.75 + 4, Math.atan(sl), 0, 7);
      } else ctx.ellipse(sx, GROUND - 2, Math.max(30, this.hw * 1.5 - air * 0.12), 13 - Math.min(6, air * 0.02), 0, 0, 7);
      ctx.fill();
      for (let i = 0; i < this.trail.length; i++) { const tr = this.trail[i], tg = this.carGeom(tr.p); this.drawPose(tr.p, tr.x - camX, tr.y + (tg ? tg.drop : 0), tr.dir, 1, 1, 0.08 + i * 0.05); }
      let ky = 1, kx = 1, ox = 0;
      if (this.state === 'idle' && !this.ibSeq) ky = 1 + Math.sin(this.t * 0.09) * 0.012;
      if (this.state === 'walk') ky = 1 + Math.abs(Math.sin(this.t * 0.35)) * 0.015;
      if (this.state === 'win') ky = 1 + Math.sin(this.t * 0.1) * 0.012;
      if (this.land > 0) { ky *= 1 - 0.07 * this.land / 6; kx = 1 + 0.05 * this.land / 6; }
      if (this.state === 'jump' && this.vy < -8) { ky *= 1.04; kx *= 0.97; }
      if (this.state === 'attack' && (this.moveName === 'punch' || this.moveName === 'kick' || this.moveName === 'low')) {
        const mv = this.move, t = this.t; ox = this.dir * (t <= mv.st ? -7 * t / mv.st : 16 * Math.sin(Math.PI * clamp((t - mv.st) / (mv.ac + 8), 0, 1)));
      }
      if (this.state === 'attack' && this.moveName === 'sp2' && this.def.sp2.drive) ky *= 1 + Math.sin(this.t * 0.6) * 0.012; // suspensión del coche
      if (this.state === 'hit' && this.t < 8) ox = (this.t % 2 ? 4 : -4);
      if (this.state === 'dizzy') ox = Math.sin(this.t * 0.12) * 10;
      if (this.fat) { const L = this.fat; if (L.a <= 0) return; this.drawPose(p, sx + L.dx + (L.kx || 0), this.y + L.dy, this.dir, kx * L.s, ky * L.s * L.sy, L.a, false, L.rot); return; }
      if (this.maletT > 0) return;
      if (this.invul > 0 && this.state !== 'getup' && this.state !== 'attack' && Math.floor(this.invul / 3) % 2) return;
      const flying = this.state === 'attack' && this.move.falcon && p !== 'punch' && !this.m.fa5;
      if (p !== this.lastPose) { this.prevPose = this.lastPose; this.lastPose = p; this.poseT = 0; } else this.poseT++;
      const cabeceo = this.state === 'attack' && this.move && this.move.drive ? -this.dir * (this.pitch || 0) : 0;
      if (this.crashT && this.state === 'attack') { const q = Math.max(0, 1 - this.crashT / 8); kx *= 1 - 0.16 * q; ky *= 1 + 0.06 * q; } // el coche se aplasta en el impacto y rebota
      const caida = cg ? cg.drop : 0; // el coche baja hasta que la rueda delantera pisa el suelo (debajo solo asoma el parachoques)
      const inm = this.escudo > 0 && Math.floor(this.escudo / (this.escudo < 60 ? 2 : 4)) % 2; // inmunidad: parpadeo en blanco, más rápido al acabarse
      if (this.fastNow && LINEAS_VEL) this.drawSpeed(p, sx + ox, this.y + caida, this.flyBack ? -this.dir : this.dir);
      if (this.cabreo > 0) this.drawAura(p, sx + ox, this.y + caida, this.flyBack ? -this.dir : this.dir, kx, ky);
      this.drawPose(p, sx + ox, this.y + caida, this.flyBack ? -this.dir : this.dir, kx, ky, null, this.flash > 0 || inm, flying ? Math.sin(this.t * 0.45) * 0.05 : cabeceo);
      // fundido de pose: la anterior se desvanece encima de la nueva durante 3 fotogramas
      const coche = this.def.sp2.drive && this.def.sp2.frames, esCoche = q => coche.includes(q) || q === 'sp2crash', cambioCoche = coche && (esCoche(p) !== esCoche(this.prevPose)); // subir o bajar del coche: sin fundido
      if (this.poseT < 3 && this.flash <= 0 && this.state !== 'hit' && !cambioCoche) this.drawPose(this.prevPose, sx + ox, this.y + caida, this.dir, kx, ky, [0.5, 0.3, 0.13][this.poseT]);
      if (this.crashT && p === 'sp2crash' && this.state === 'attack') this.drawCrash(sx, this.m[p]);
    }
  }

  // ---------- IA ----------
  function aiInput(f, opp, G) {
    const o = { l: false, r: false, u: false, d: false }, a = f.ai, lvl = f.level;
    const dx = opp.x - f.x, dist = Math.abs(dx), toward = dx >= 0 ? 'r' : 'l', away = dx >= 0 ? 'l' : 'r';
    if (G.phase !== 'fight') return o;
    const oppAtk = opp.state === 'attack' && opp.t < opp.move.st + opp.move.ac + 2 && dist < 300;
    const projNear = G.projs.some(p => p.owner === opp && Math.abs(p.x - f.x) < 230 && Math.sign(p.vx) === Math.sign(f.x - p.x));
    const novaNear = (G.sup && G.sup.f === opp && !G.sup.locked) || G.assists.some(as => as.owner === opp && Math.abs(as.x - f.x) < 260);
    if ((oppAtk || projNear || novaNear) && a.blockT <= 0 && Math.random() < 0.3 + lvl * 0.075) a.blockT = 16;
    if (a.blockT > 0) { a.blockT--; o[away] = true; return o; }
    if (f.state === 'jump' && a.jumpAtk && f.vy > 0 && dist < 210) { o.kick = true; a.jumpAtk = false; }
    if (a.moveT > 0) { a.moveT--; if (a.moveDir) o[a.moveDir > 0 ? toward : away] = true; }
    { const ti = G.f.indexOf(f), rv = G.res && G.res[ti]; if (rv && f.free && G.canTag(f) && f.hp < f.maxHp * 0.3 && rv.hp > f.hp * 1.6 && Math.random() < 0.02 + lvl * 0.005) { o.assist = true; o.d = true; return o; } }
    if (f.free && f.assistCd <= 0 && Math.random() < 0.004 + lvl * 0.0015) o.assist = true;
    if (f.free && G.propNear(f) && Math.random() < 0.05) { o.d = true; o.punch = true; return o; }
    // caos: esquiva misiles y tractores, y a veces corre a pulsar el botón rojo (saltando encima)
    const T = G.tractor; if (T && T.t > 60 && f.grounded && Math.abs(T.x - f.x) < 420 && (f.x - T.x) * T.dir > 0) { if (a.trac == null) a.trac = Math.random() < 0.35 + lvl * 0.08; if (a.trac) { o.u = true; return o; } } else a.trac = null;
    const mis = (G.misiles || []).find(m => Math.abs(m.x - f.x) < 150 && m.y > 80); if (mis && f.free) { if (a.mis !== mis) { a.mis = mis; a.misOk = Math.random() < 0.3 + lvl * 0.08; } if (a.misOk) { o[mis.x > f.x ? 'l' : 'r'] = true; return o; } }
    const it = (G.items || [])[0]; if (!it) a.itGo = null; else if (a.itGo == null) a.itGo = Math.random() < 0.4 + lvl * 0.06;
    if (f.free && it && a.itGo) { const d = it.x - f.x; if (Math.abs(d) > 30) { o[d > 0 ? 'r' : 'l'] = true; return o; } }
    const gz = (G.gas || []).find(z => Math.abs(z.x - f.x) < 150); if (gz && f.free && Math.random() < 0.5 + lvl * 0.05) { o[gz.x > f.x ? 'l' : 'r'] = true; return o; }
    const cr = (G.misiles || []).find(m => m.kind === 'crucero' && !(m.warn > 0) && Math.abs(m.x - f.x) < 420 && (f.x - m.x) * m.dir > 0); if (cr && f.grounded && Math.random() < 0.45 + lvl * 0.07) { o.u = true; return o; }
    if (!G.btn) a.btnGo = null; else if (G.btn.t > 20 && a.btnGo == null) a.btnGo = Math.random() < 0.3 + lvl * 0.05;
    if (f.free && G.btn && a.btnGo) { const bd = G.btn.x - f.x; if (Math.abs(bd) > 50) o[bd > 0 ? 'r' : 'l'] = true; else o.u = true; return o; }
    if (--a.cool > 0 || !f.free) return o;
    a.cool = Math.max(5, 22 - lvl * 3) + rand(0, 10);
    const r = Math.random();
    if (f.meter >= 100 && dist < 430 && r < 0.5 + lvl * 0.05) o.super = true;
    else if (dist > 520) { if (r < 0.3) o.sp1 = true; else if (r < 0.4) { o.u = true; o[toward] = true; a.jumpAtk = true; } else { a.moveT = 28; a.moveDir = 1; } }
    else if (dist > 220) {
      if (r < 0.42) { a.moveT = 18; a.moveDir = 1; } else if (r < 0.62) o.sp2 = true; else if (r < 0.78) o.sp1 = true;
      else if (r < 0.92) { o.u = true; o[toward] = true; a.jumpAtk = true; } else { a.moveT = 14; a.moveDir = -1; }
    } else {
      if (r < 0.3) o.punch = true; else if (r < 0.58) o.kick = true; else if (r < 0.74) { o.d = true; o.kick = true; }
      else if (r < 0.86) o.sp2 = true; else { a.moveT = 16; a.moveDir = -1; }
    }
    return o;
  }

  // ---------- Combate ----------
  const VO = { 'K.O.': 'ko', 'Tiempo': 'tiempo', '¡A pelear!': 'pelear', 'Asalto final': 'asaltofinal', 'Asalto 1': 'asalto1', 'Asalto 2': 'asalto2', 'Asalto 3': 'asaltofinal', 'Asalto de desempate': 'asaltofinal', 'Doble K.O.': 'ko', '¡Mayoría absoluta!': 'mayoria', '¡Remátalo!': 'ko' };
  const ASSIST_CD = 540;

  // Compañero de apoyo: entra desde detrás de quien lo llama, hace su especial 2 y se va
  class Assist {
    constructor(owner, def) {
      this.owner = owner; this.def = def; this.id = def.id; this.m = META[def.id]; this.k = def.height / this.m.idle.h;
      this.dir = owner.dir; this.x = owner.x - owner.dir * 760; this.y = GROUND; this.t = 0; this.at = 0; this.vy = 0; this.phase = 'in'; this.hit = false; this.alpha = 1;
      const s = def.sp2; this.rush = s.type === 'rush' || s.type === 'falcon'; this.once = s.anim === 'once' || s.type === 'upper';
      this.frames = ['sp2a', 'sp2b', 'sp2c', 'sp2d'].filter(p => this.m[p]); if (!this.frames.length) this.frames = ['sp2'];
      this.runFrames = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'].filter(p => this.m[p]); this.sp2Frames = ['sp2a', 'sp2b', 'sp2c', 'sp2d'].filter(p => this.m[p]); this.trail = []; this.land = 0; this.assistCd = 0;
      const wf = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'].filter(p => this.m[p]); this.run = wf.length >= 3 ? wf : ['idle', 'walk'];
      this.dist = 999; this.ht = 0; this.gal = ['gal1', 'gal2', 'gal3', 'gal4', 'gal5', 'gal6', 'gal7', 'gal8'].filter(p => this.m[p]);
      this.state = 'attack'; this.moveName = 'sp2'; this.wheelA = 0; this.beaten = false; // para dibujarse con drawPose de Fighter (ruedas)
      this.car = !!(s.drive && s.wheels && s.frames); this.crashT = 0; if (this.car) Sound.play('motor'); // Aguirra entra en su coche, como cuando la manejas
      this.fly = s.type === 'falcon' && !!this.m.fa5; if (this.fly) this.y = GROUND - 110;
    }
    pose() {
      const n = this.frames.length;
      if (this.fly) return this.t < 5 ? 'fa2' : this.hit || this.dist < 230 ? 'fa5' : Math.floor(this.t / 5) % 2 ? 'fa4' : 'fa3';
      if (this.phase === 'out') return 'win';
      if (this.car) return this.crashT && this.m.sp2crash ? 'sp2crash' : (this.def.sp2.frames.find(q => this.m[q]) || this.frames[0]); // el coche: un solo dibujo, con las ruedas girando
      if (this.rush && this.gal.length >= 4) return this.gal[Math.floor(this.t / 3) % this.gal.length]; // el caballo galopa
      if (this.rush && this.once) return this.dist > 300 ? this.run[Math.floor(this.t / 3) % this.run.length] : this.frames[clamp(Math.floor((300 - this.dist) / 300 * n), 0, n - 1)];
      if (this.rush) return this.once ? this.frames[Math.min(n - 1, Math.floor(this.t / 9))] : this.frames[Math.floor(this.t / 4) % n];
      if (this.phase === 'in') return this.run[Math.floor(this.t / 4) % this.run.length];
      return this.once ? this.frames[Math.min(n - 1, Math.floor(this.at / 30 * n))] : this.frames[Math.floor(this.at / 4) % n];
    }
    update(G, opp) {
      this.t++; const dist = this.dist = (opp.x - this.x) * this.dir;
      if (this.car) { // coche: entra lanzado, y si pilla al rival se estampa (morro aplastado, humo, estrellas) y rebota; si no, sigue de largo
        const vmax = Math.max(14, this.def.sp2.vx + 3);
        if (!this.crashT) {
          this.vx = this.dir * vmax; this.x += this.vx; this.wheelA += vmax * 0.09; this.pitch = 0.02 + Math.sin(this.t * 0.7) * 0.008;
          if (this.t > 6 && Math.abs(opp.x - this.x) < 120 + opp.hw) { this.tryHit(G, opp); this.crashT = 1; Sound.play('choque'); G.shake = Math.max(G.shake || 0, 12); G.spark(this.x + this.dir * 150, GROUND - 90, '#fff', 14); G.spark(this.x + this.dir * 120, GROUND - 40, '#ffb347', 10); }
          if (dist < -700 || this.t > 160) this.dead = true;
        } else {
          this.crashT++; this.x -= this.dir * Math.max(0, 7 - this.crashT * 0.6); this.pitch += ((this.crashT < 5 ? -0.09 : 0) - this.pitch) * 0.3;
          if (this.crashT > 48) { this.alpha = Math.max(0, 1 - (this.crashT - 48) / 18); if (this.alpha <= 0) this.dead = true; }
        }
        return;
      }
      if (this.phase === 'in') {
        this.x += this.dir * (this.rush ? Math.max(14, this.def.sp2.vx + 3) : 16);
        if (this.rush) { if (!this.hit && this.t > 6 && Math.abs(opp.x - this.x) < 90 + opp.hw) this.tryHit(G, opp); if (this.hit) this.ht++; if (this.once ? (dist < -150 || this.ht > 14) : (dist < -460 || this.t > 140)) { if (this.once) { this.phase = 'out'; this.at = 0; } else this.dead = true; } if (this.t > 160) this.dead = true; }
        else if (dist < 130 || this.t > 75) { this.phase = 'act'; if (this.def.sp2.type === 'upper') this.vy = -15; }
      } else if (this.phase === 'act') {
        this.at++; if (this.vy || this.y < GROUND) { this.vy += 0.95; this.y = Math.min(GROUND, this.y + this.vy); }
        this.x += this.dir * 3;
        if (!this.hit && this.at > 4 && this.at < 26 && Math.abs(opp.x - this.x) < 150 + opp.hw) this.tryHit(G, opp);
        if (this.at > 32 && this.y >= GROUND) { this.phase = 'out'; this.at = 0; }
      } else { this.at++; this.alpha = 1 - this.at / 26; if (this.at >= 26) this.dead = true; }
    }
    tryHit(G, opp) { if (G.strike(this.owner, opp, 9 * this.def.power, { special: true, kd: true, fromX: this.x - this.dir * 10, hx: opp.x, sfx: 'heavy' }) !== null) this.hit = true; }
    draw(cam) {
      let p = this.pose(); if (!this.m[p]) p = 'idle'; const m = this.m[p], im = IMG[this.id + '/' + p]; if (!im || !im.complete || !im.naturalWidth) return;
      ctx.save(); ctx.globalAlpha = Math.max(0, this.alpha); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x - cam + (this.car ? this.dir * 70 : 0), GROUND - 2, this.car ? 170 : 60, 11, 0, 0, 7); ctx.fill();
      if (this.car) { // coche: pegado al suelo por las ruedas, ruedas girando, cabeceo y, al estamparse, aplastado elástico con humo y estrellas
        ctx.restore(); const cg = Fighter.prototype.carGeom.call(this, p), ct = this.crashT, sx = this.x - cam;
        const sq = ct && ct < 12 ? Math.sin(ct / 12 * Math.PI) * 0.14 : 0, a = this.alpha < 1 ? this.alpha : null;
        if (a != null) { ctx.save(); ctx.globalAlpha = a; }
        Fighter.prototype.drawPose.call(this, p, sx, this.y + (cg ? cg.drop : 0), this.dir, 1 - sq, 1 + sq * 0.6, null, false, -this.dir * (this.pitch || 0));
        if (ct && this.m[p]) Fighter.prototype.drawCrash.call(this, sx, this.m[p]);
        if (a != null) ctx.restore(); return;
      }
      ctx.translate(this.x - cam, this.y); ctx.scale(this.dir * this.k, this.k); ctx.drawImage(im, -m.ax, -m.h, m.w, m.h); ctx.restore();
    }
  }

  // bocanada de humo en pixel art: celdas de 4 px, tres tonos según la luz (arriba a la izquierda), contorno oscuro y fundido por tramado
  const PUFF_PAL = { negro: ['#16141a', '#2b2830', '#46424d', '#6a6672'], gris: ['#3c3a42', '#66636e', '#94919c', '#c4c1cc'] };
  // bomba de humo (AL MALETERO): «Smoke n Dust 03» de pimen (itch.io; uso comercial libre, sin atribución obligatoria)
  const HUMO = {}; const humoIm = n => { if (!HUMO[n]) { const im = new Image(); im.src = V(`assets/vfx/${n}.webp`); HUMO[n] = im; } return HUMO[n]; };
  function humoSprite(n, fw, nf, f, x, y, esc, flip) { // fotograma f de la tira n (cuadros de fw px), centrado en x y apoyado en y
    const im = humoIm(n); if (!im.complete || !im.naturalWidth || f < 0 || f >= nf) return; const fh = im.naturalHeight, w = fw * esc, h = fh * esc;
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(x), Math.round(y)); if (flip) ctx.scale(-1, 1); ctx.drawImage(NOCHE ? tinte(im, 'vfx/' + n + '|noche', FNOCHE) : im, f * fw, 0, fw, fh, -w / 2, -h, w, h); ctx.restore(); // de noche, el mismo tono que los luchadores
  }
  function drawHumo(e, cam) {
    const t = e.t, H = e.h || 400, esc = Math.max(2, Math.round(H / 140)), s = Math.sign(e.x1 - e.x0) || 1; // hojas ampliadas x4 con Scale2x: píxel fino (~3 px), como el resto del juego
    // «Smoke n Dust 03» VFX 1 (9 cuadros de 80x64 → 320x256 tras Scale2x x2; el suelo en la fila 200): la nube sale del suelo y tapa al luchador
    const nube = (x, t0, fl) => { const u = t - t0; if (u < 0) return; humoSprite('pimen_humo1', 320, 9, 1 + Math.floor(u / 5), x - cam, GROUND + 56 * esc, esc, fl); };
    nube(e.x0, 0, s < 0);
    for (let k = 0; k < 4; k++) { const u = t - (8 + k * 3); if (u >= 0) humoSprite('pimen_humo4', 256, 9, Math.floor(u / 3), e.x0 + (e.x1 - e.x0) * (k + 0.5) / 4 - cam, GROUND + 64, 1, s < 0); } // VFX 4: rastro a ras de suelo
    nube(e.x1, 30, s > 0); // a los 40 fotogramas reaparece justo en lo más denso de la nube
  }
  function drawPuff(x, y, r, fade, pal, c = 4) {
    const P = PUFF_PAL[pal] || PUFF_PAL.gris, n = Math.ceil(r / c), x0 = Math.round(x / c) * c, y0 = Math.round(y / c) * c;
    for (let gy = -n; gy <= n; gy++) for (let gx = -n; gx <= n; gx++) {
      const dx = gx * c, dy = gy * c, d = Math.sqrt(dx * dx + dy * dy) / r; if (d > 1) continue;
      const k = ((gx & 3) * 4 + (gy & 3)) * 0.0625; if (k < fade) continue; // tramado ordenado: se deshace a cuadritos
      const luz = (-dx - dy) / (r * 1.41);
      ctx.fillStyle = d > 0.86 ? P[0] : luz > 0.35 ? P[3] : luz > -0.1 ? P[2] : P[1];
      ctx.fillRect(x0 + dx, y0 + dy, c, c);
    }
  }

  function speedLines(color, t, alpha, dir) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#05050d'; ctx.fillRect(-OX, 0, VW, H);
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (let i = 0; i < 30; i++) {
      const y = (i * 53 + (i % 5) * 17) % H, len = 160 + (i * 71) % 340, span = W + len + 200;
      let x = (t * (30 + (i % 7) * 9) + i * 190) % span - len - 100; if (dir < 0) x = W - x - len;
      ctx.globalAlpha = alpha * (0.2 + (i % 4) * 0.12); ctx.lineWidth = 2 + (i % 4) * 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- CAOS: el botón rojo y las noticias de ÚLTIMA HORA ----------
  // lo que cambia la partida sale de Math.random dentro de update (en online va con la semilla común); lo que solo se ve, de hash()
  const NOTICIAS = [
    { id: 'apagon', t: 'APAGÓN GENERAL', s: 'SE VA LA LUZ: SE PELEA A OSCURAS' },
    { id: 'dana', t: 'TEMPORAL DE LLUVIA', s: 'DILUVIA Y EL SUELO RESBALA' },
    { id: 'recortes', t: 'RECORTES', s: 'TODOS LOS GOLPES QUITAN MÁS' },
    { id: 'amnistia', t: 'AMNISTÍA GENERAL', s: 'LA BARRA DE SÚPER SE LLENA EL DOBLE' },
    { id: 'hacienda', t: 'HACIENDA SOMOS TODOS', s: 'CADA POCO EMBARGAN MEDIA BARRA AL QUE MÁS TIENE' },
    { id: 'sobres', t: 'LLUVIA DE SOBRES', s: 'COGE LOS SOBRES: LLENAN EL SÚPER' },
    { id: 'misiles', t: 'CRISIS DE LOS MISILES', s: 'EL BOTÓN ROJO SALE SIN PARAR' },
    { id: 'tractorada', t: 'TRACTORADA', s: 'PASAN TRACTORES: ¡SALTA!' },
    { id: 'tormenta', t: 'TORMENTA ELÉCTRICA', s: 'CAEN RAYOS: ¡QUÍTATE DE LA MARCA!' },
  ];
  // el caos (botones, armas, inmunidad, noticias) es un modo aparte (¡MODOS LOCOS! > MODO CAOS) y el laboratorio; el resto es lucha pura
  const caosOn = M => CFG.caos !== false && (M.mode === 'caos' || M.mode === 'lab');
  const nadie = x => ({ x, meter: 0, def: {} }); // «atacante» de lo que no es de nadie (misiles propios, tractores)
  const pr = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  // efectos de Sprite Fusion (vfx-spritefusion.js, MIT): cada uno pinta en su propio búfer de píxeles, que se dibuja escalado.
  // Son solo dibujo (su azar va con su propia semilla), así que no afectan al online.
  const SFQ = 4, SF_W = 200, SF_H = 150, SF_G = 120; // píxel del efecto = 4 px del juego; el suelo del efecto, en la fila 120
  // gx, gy: dónde va en el juego; el efecto se monta con el suelo en su fila SF_G y centrado en gx
  const sfY = gy => SF_G * 2 + (gy - GROUND - 6) / SFQ * 2;
  function sfNuevo(tipo, x, opts, gy) {
    const V = window.SF_VFX; if (!V || !V[tipo]) return null;
    // algunos efectos necesitan un búfer más grande: si no, el humo de las explosiones choca con el borde y se ve el corte recto
    const bw = (opts && opts.ancho) || SF_W, bh = (opts && opts.alto) || SF_H, G = bh - (SF_H - SF_G);
    const c = document.createElement('canvas'), l = document.createElement('canvas'); c.width = l.width = bw; c.height = l.height = bh;
    const fr = { w: bw, h: bh, ox: 0, oy: 0, color: new Uint32Array(bw * bh), light: new Uint32Array(bw * bh) };
    if (opts && opts.actor) { const ft = opts.actor.feet; opts.actor = { feet: () => { const p = ft(); return [bw, p[1]]; } }; }
    const fx = V[tipo](Object.assign({ x: bw, y: gy == null ? G * 2 : sfY(gy) + (G - SF_G) * 2, ground: G * 2 }, opts));
    return { fx, fr, c, l, cx: c.getContext('2d'), lx: l.getContext('2d'), x, bw, bh, G, done: false };
  }
  function sfDibuja(E, cam) {
    if (!E || E.done) return; const { fx, fr, bw, bh } = E;
    fx.update(1 / 60); fr.color.fill(0); fr.light.fill(0); fx.draw(fr, 'back'); fx.draw(fr, 'front');
    E.cx.putImageData(new ImageData(new Uint8ClampedArray(fr.color.buffer), bw, bh), 0, 0);
    E.lx.putImageData(new ImageData(new Uint8ClampedArray(fr.light.buffer), bw, bh), 0, 0);
    const dx = Math.round(E.x - cam - (bw / 2) * SFQ), dy = GROUND + 6 - (E.G || SF_G) * SFQ, was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(E.c, dx, dy, bw * SFQ, bh * SFQ);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(E.l, dx, dy, bw * SFQ, bh * SFQ); ctx.restore(); ctx.imageSmoothingEnabled = was;
    if (fx.done()) E.done = true;
  }
  // explosión de misil en pixel art, por capas (como las de recreativa): destello, bola de fuego, onda expansiva en el suelo,
  // chispas, cascotes y humo que pasa de fuego a negro y se deshace. Solo se dibuja: el azar sale de hash(semilla)
  function pxExplosion(e, cam) {
    const t = e.t, q = 6, x = e.x - cam, y = e.y, R = i => hash(e.seed + i * 1.618), ease = k => 1 - Math.pow(1 - Math.min(1, k), 3);
    // destello inicial
    if (t < 3) { ctx.globalAlpha = 0.8 - t / 4; pxCirc(x, y, 70 + t * 30, '#ffffff', q); ctx.globalAlpha = 1; }
    // onda expansiva aplastada contra el suelo
    if (t < 16) { const r = 40 + t * 16, a = 1 - t / 16; ctx.globalAlpha = a; for (let i = 0; i < 40; i++) { const an = i / 40 * 6.283, px = x + Math.cos(an) * r, py = GROUND + 4 + Math.sin(an) * r * 0.18; pr(px - 5, py - 3, 10, 6, t < 6 ? '#ffffff' : '#ffe9a0'); } ctx.globalAlpha = 1; }
    // humo: bolas que suben, crecen y pasan de fuego a negro
    for (let i = 0; i < 7; i++) {
      const t0 = 8 + i * 2, u = t - t0; if (u < 0) continue;
      const k = u / 40; if (k >= 1) continue;
      const sx = x + (R(i) - 0.5) * 120 + (R(i + 9) - 0.5) * u * 1.2, sy = y - 20 - u * (1.6 + R(i + 3)), sr = 26 + u * 1.3;
      const col = k < 0.15 ? '#c2410c' : k < 0.35 ? '#5b2a1a' : k < 0.6 ? '#3a3236' : '#222026';
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; pxCirc(sx, sy, sr + 6, '#120c10', q); pxCirc(sx, sy, sr, col, q); pxCirc(sx - sr * 0.3, sy - sr * 0.3, sr * 0.45, k < 0.35 ? '#e8742a' : '#4a4248', q); ctx.globalAlpha = 1;
    }
    // bola de fuego: lóbulos que crecen rápido, se elevan y se apagan
    if (t < 26) {
      const g = ease(t / 10), lift = Math.max(0, t - 10) * 2.2, fade = t < 16 ? 1 : 1 - (t - 16) / 10;
      ctx.globalAlpha = Math.max(0, fade);
      const capas = [['#7a0d0d', 1], ['#d0111f', 0.86], ['#ff6a1a', 0.7], ['#ffb31f', 0.52], ['#fff3a0', t < 12 ? 0.32 : 0], ['#ffffff', t < 6 ? 0.18 : 0]];
      pxCirc(x, y - lift, 112 * g, '#2a0606', q); for (const [col, f] of capas) { if (!f) continue; for (let i = 0; i < 6; i++) { const an = R(i + 20) * 6.283, d = 40 * g * R(i + 30), r = (60 + 50 * R(i + 40)) * g * f; pxCirc(x + Math.cos(an) * d, y - lift + Math.sin(an) * d * 0.7, r, col, q); } }
      ctx.globalAlpha = 1;
    }
    // chispas
    for (let i = 0; i < 22; i++) {
      if (t > 30) break; const an = R(i + 50) * 6.283, v = 8 + R(i + 60) * 12, d = v * t * (1 - t / 60), px = x + Math.cos(an) * d, py = y + Math.sin(an) * d * 0.8 + t * t * 0.05;
      ctx.globalAlpha = 1 - t / 30; pr(px - 3, py - 3, 6, 6, i % 3 ? '#ffd23a' : '#ffffff'); ctx.globalAlpha = 1;
    }
    // cascotes con estela de fuego
    for (let i = 0; i < 9; i++) {
      const an = -Math.PI * (0.15 + R(i + 70) * 0.7), v = 10 + R(i + 80) * 9, px = x + Math.cos(an) * v * t, py = y + Math.sin(an) * v * t + 0.9 * t * t;
      if (py > GROUND + 10) continue; const sz = 8 + Math.round(R(i + 90) * 2) * 4;
      pr(px - 4 - Math.cos(an) * 10, py - 4 - Math.sin(an) * 10, 8, 8, t < 14 ? '#ff8a1a' : '#5b4a40'); pr(px - sz / 2, py - sz / 2, sz, sz, '#2a2220'); pr(px - sz / 2, py - sz / 2, sz / 2, sz / 2, '#6b5a50');
    }
  }
  function pxCirc(cx, cy, r, c, q) { q = q || 6; ctx.fillStyle = c; for (let y = -r; y < r; y += q) { const m = y + q / 2, w = Math.round(Math.sqrt(Math.max(0, r * r - m * m)) / q) * q; if (w > 0) ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, q); } }
  function caosRonda(M) {
    Object.assign(M, { btnRonda: false, btnAnim: null, btn: null, btnT: 60 * (6 + Math.random() * 8), alarm: null, misiles: [], scorch: [], gas: [], items: [], itemT: 60 * (6 + Math.random() * 8), sobres: [], tractor: null, tractorT: 60 * (3 + Math.random() * 3), embargoT: 480, newsT: 0, teeth: [] });
    M.f.forEach(f => { f.slip = 0; f.px = null; f.mPrev = null; f.veneno = 0; f.escudo = 0; });
    M.news = null; if (!caosOn(M)) return;
    M.f.forEach(f => { if (f.meterIni) f.meter = Math.max(f.meterIni, f.meter); });
    if (M.lab) { const L = M.lab; if (L.vida < 1) M.f[1].hp = M.f[1].maxHp * L.vida; if (L.boton) M.btnT = 120; if (L.noticia === 'ninguna') { M.news = null; return; } if (L.noticia !== 'azar') { M.news = NOTICIAS.find(n => n.id === L.noticia); if (L.noticia === 'misiles') M.btnT = 150; return; } }
    if (M.newsForce) { M.news = NOTICIAS.find(n => n.id === M.newsForce); if (M.newsForce === 'misiles') M.btnT = 150; return; }
    if (CFG.noticias !== false && Math.random() < (M.round > 1 ? 0.85 : 0.55)) { const pool = NOTICIAS.filter(n => n.id !== M.newsPrev); M.news = pool[Math.floor(Math.random() * pool.length)]; M.newsPrev = M.news.id; }
    if (M.news && M.news.id === 'misiles') M.btnT = 150;
  }
  // el botón rojo lanza un bombardeo al azar; el verde, bombas bacteriológicas
  const BOMBARDEOS = { misiles: '¡LLUVIA DE MISILES!', racimo: '¡BOMBAS DE RACIMO!', crucero: '¡MISILES DE CRUCERO: SALTA!', nuclear: '¡BOMBA NUCLEAR!', bio: '¡BOMBAS BACTERIOLÓGICAS!' };
  function caosBoton(M, f, B) {
    const mis = M.news && M.news.id === 'misiles', r = Math.random();
    const tipo = B && B.color === 'verde' ? 'bio' : r < 0.4 ? 'misiles' : r < 0.65 ? 'racimo' : r < 0.87 ? 'crucero' : 'nuclear';
    if (B) M.btnAnim = { x: B.x, color: B.color, t: 0 }; M.btn = null; M.btnRonda = true; /* un solo botón por asalto */ M.alarm = { by: f, t: 0, tipo }; M.btnT = 60 * (mis ? 5 + Math.random() * 3 : 16 + Math.random() * 10);
    M.shake = Math.max(M.shake, 10); M.flashT = 4; Sound.play('super'); M.callout(f, BOMBARDEOS[tipo]);
  }
  // un arma toca el suelo (o a alguien): explosión, daño en su radio y, si es bacteriológica, nube tóxica
  const FAM_HOJA = {}; // hojas 4x2 de los objetos de los súper de familia (assets/vfx/<objeto>.webp), cargadas al empezar el combate
  function famHoja(obj) { if (!obj) return null; let im = FAM_HOJA[obj]; if (!im) { im = FAM_HOJA[obj] = new Image(); im.src = V('assets/vfx/' + obj + '.webp'); } return im.complete && im.naturalWidth ? im : null; }
  const JOYA_COL = ['#e0f4ff', '#e0202a', '#1fc25a', '#2a5cff', '#ffd23f', '#c04dff', '#ff8ac8', '#3ad8e0']; // diamante, rubí, esmeralda, zafiro, oro, amatista, rosa, aguamarina
  const ARMA = { misil: [96, 7, 1.5], racimo: [110, 8, 1.7], bomblet: [70, 4, 0.9], crucero: [90, 9, 1.4], nuclear: [340, 20, 3.2], bio: [70, 3, 0] };
  function caosImpacto(M, m, fight) {
    const [rad, dmg, size] = ARMA[m.kind] || ARMA.misil, x = m.x, F = M.f; m.dead = true;
    if (m.kind === 'bio') { M.gas.push({ x, t: 0, life: 380, by: m.by }); M.sfx('poison', x, GROUND, { kind: 'cloud', size: 1.4 }, null, null, 330); Sound.play('whoosh'); M.shake = Math.max(M.shake, 6); }
    else {
      M.fx.push({ type: 'mboom', x, y: GROUND - 70, t: 0, life: 300, seed: Math.random() * 1000, size });
      M.flashT = Math.max(M.flashT, m.kind === 'nuclear' ? 22 : 2); M.shake = Math.max(M.shake, m.kind === 'nuclear' ? 40 : 14); Sound.play(m.kind === 'nuclear' || Math.random() < 0.35 ? 'nova' : 'heavy');
      M.scorch.push({ x, r: (34 + Math.random() * 22) * (m.kind === 'nuclear' ? 3 : 1) }); if (M.scorch.length > 26) M.scorch.shift();
    }
    if (fight) for (const g of F) if (Math.abs(g.x - x) < rad + g.hw && g.y > GROUND - (m.kind === 'nuclear' ? 600 : 230) && g.state !== 'fall') {
      const propio = g === m.by; if (propio && (g.dBoton || m.kind === 'bio')) continue; // la bacteriológica no afecta a quien pulsó el botón
      M.strike(propio ? nadie(x) : m.by, g, propio ? dmg * 0.5 : dmg, { special: true, kd: true, fromX: x, hx: g.x, hy: 0.5, color: m.kind === 'bio' ? '#8eea3f' : '#ff7a1a', sfx: 'heavy' });
    }
  }
  function caosUpdate(M) {
    const fight = M.phase === 'fight', N = id => M.news && M.news.id === id, F = M.f;
    for (const s of M.sobres) {
      s.t++; if (s.vy < 0 || s.y < GROUND - 12) { s.y = Math.min(GROUND - 12, s.y + s.vy); if (s.vy < 4) s.vy += 0.5; } if (s.vx) { s.x = clamp(s.x + s.vx, 40, STAGE_W - 40); s.vx *= 0.95; } if (s.t > 60 * 9) s.dead = true;
      if (fight && s.t > 12) for (const g of F) if (!s.dead && Math.abs(g.x - s.x) < g.hw + 28 && s.y > g.y - g.hh - 20 && s.y < g.y + 10) { s.dead = true; g.meter = Math.min(100, g.meter + 18); Sound.play('blip'); M.spark(s.x, s.y - 20, '#ffe14a', 4); }
    }
    M.sobres = M.sobres.filter(s => !s.dead);
    if (!caosOn(M)) return;
    M.newsT++;
    if (M.btnAnim && ++M.btnAnim.t > 150) M.btnAnim = null;
    // el botón rojo: sale cada cierto tiempo; lo activa quien le pegue o caiga encima de un salto
    if (fight && CFG.boton !== false && !M.btn && !M.alarm && !(M.btnRonda && !M.lab) && (M.btnT -= F.some(g => g.dBoton) ? 2 : 1) <= 0) M.btn = { x: clamp(M.camX + 160 + Math.random() * (W - 320), 120, STAGE_W - 120), t: 0, color: M.lab && M.lab.boton ? M.lab.boton : N('misiles') || Math.random() < 0.7 ? 'rojo' : 'verde' };
    if (M.lab && M.lab.boton && !M.btn && !M.alarm && M.btnT > 180) M.btnT = 180;
    if (M.btn) {
      const B = M.btn; B.t++;
      B.abre = F.some(g => Math.abs(g.x - B.x) < 230) ? (B.abre || 0) + 1 : 0; // la tapa de seguridad se abre cuando alguien se acerca
      if (B.por) { // la animación de pulsar: el botón salta cuando la mano (o los pies) llegan abajo; si le pegan antes, no cuenta
        B.pt++; if (B.por.state !== 'pulsa') B.por = null; else if (B.pt === (B.por.pulsaPisa ? 3 : 10)) { caosBoton(M, B.por, B); }
      }
      else if (B.t > 60 * 14 || !fight) { M.btn = null; M.btnT = 60 * (8 + Math.random() * 8); }
      else if (B.t > 20) for (const f of F) {
        const hb = f.active(), pisa = f.grounded && f.land > 0 && Math.abs(f.x - B.x) < 64;
        if (B.por) break;
        const alLado = hb && f.grounded && f.state === 'attack' && f.ok('b2') && Math.abs(B.x - (f.x + f.dir * 70)) < 80; // con sus dibujos, cualquier golpe estando al lado lo pulsa
        if (pisa || alLado || (hb && hb.x0 < B.x + 50 && hb.x1 > B.x - 50 && hb.y1 > GROUND - 90)) {
          // con sus dibujos de pulsar (b1-b8), se ve cómo lo aporrea con la mano o lo pisa de un salto; sin ellos, salta al momento
          if (f.ok('b2') && f.ok('b8')) { f.set('pulsa'); f.pulsaPisa = pisa; f.move = null; f.dir = B.x >= f.x ? 1 : -1; f.x = clamp(B.x - f.dir * (pisa ? 0 : 70), 60, STAGE_W - 60); B.por = f; B.pt = 0; }
          else caosBoton(M, f, B);
          break;
        }
      }
    }
    // ...y la lluvia de misiles: casi todos van al rival, pero alguno cae sobre quien lo pulsó (a ese le hace menos)
    if (M.alarm) {
      const A = M.alarm; A.t++;
      if (A.t < 70 && A.t % 20 === 1) Sound.play('special');
      const rival = F.find(g => g !== A.by) || F[1], cerca = (g, d) => clamp(g.x + (Math.random() - 0.5) * d, 40, STAGE_W - 40), tipo = A.tipo || 'misiles';
      const blanco = () => Math.random() < 0.72 ? rival : F.find(g => g === A.by) || rival;
      if (fight && A.t >= 70) {
        if (tipo === 'misiles' && A.t < 310 && A.t % 12 === 0) M.misiles.push({ kind: 'misil', x: cerca(blanco(), 320), y: -160, vy: 4, by: A.by });
        if (tipo === 'racimo' && A.t < 230 && A.t % 50 === 20) M.misiles.push({ kind: 'racimo', x: cerca(blanco(), 260), y: -160, vy: 3, by: A.by });
        if (tipo === 'bio' && A.t < 220 && A.t % 30 === 10) M.misiles.push({ kind: 'bio', x: cerca(blanco(), 280), y: -160, vy: 3, by: A.by });
        if (tipo === 'crucero' && A.t < 300 && A.t % 75 === 10) { const d = Math.random() < 0.5 ? 1 : -1; M.misiles.push({ kind: 'crucero', dir: d, x: d > 0 ? M.camX - 200 : M.camX + W + 200, y: GROUND - 75, vx: 0, warn: 45, by: A.by }); }
        if (tipo === 'nuclear' && A.t === 70) M.misiles.push({ kind: 'nuclear', x: clamp((F[0].x + F[1].x) / 2, 200, STAGE_W - 200), y: -320, vy: 1.2, by: A.by });
      }
      if (A.t > (tipo === 'nuclear' ? 420 : 340) && !M.misiles.length) M.alarm = null;
    }
    const nuevos = [];
    for (const m of M.misiles) {
      m.t = (m.t || 0) + 1;
      if (m.kind === 'crucero') { // vuela a ras de suelo de un lado a otro: hay que saltarlo
        if (m.warn > 0) { m.warn--; continue; } m.x += m.dir * 17;
        const g = F.find(q => Math.abs(q.x - m.x) < 70 && q.y > GROUND - 150 && q.state !== 'fall'); if (g && fight) { caosImpacto(M, m, fight); continue; }
        if ((m.dir > 0 && m.x > M.camX + W + 260) || (m.dir < 0 && m.x < M.camX - 260)) m.dead = true; continue;
      }
      m.vy += m.kind === 'nuclear' ? 0.12 : 0.75; m.y += m.vy; if (m.vx) m.x += m.vx;
      if (m.kind === 'racimo' && m.y > 230) { m.dead = true; Sound.play('block'); for (let i = 0; i < 5; i++) nuevos.push({ kind: 'bomblet', x: m.x, y: m.y, vy: -3, vx: (i - 2) * 3.2, by: m.by }); continue; }
      if (m.y >= GROUND - 16) caosImpacto(M, m, fight);
    }
    M.misiles = M.misiles.filter(m => !m.dead).concat(nuevos);
    // nubes tóxicas: quien está dentro queda intoxicado y va perdiendo vida (salvo con escudo)
    for (const z of M.gas) { z.t++; if (fight && z.t > 20) for (const g of F) if (g !== z.by && Math.abs(g.x - z.x) < 120 + g.hw && g.y > GROUND - 280 && !(g.escudo > 0)) { if (!(g.veneno > 0)) { M.callout(g, '¡INTOXICADO!'); M.sfx('poison', g.x, GROUND, { kind: 'aura' }, null, g, 170); } g.veneno = Math.max(g.veneno || 0, 170); } }
    M.gas = M.gas.filter(z => z.t < z.life);
    for (const g of F) {
      if (g.veneno > 0) { g.veneno--; if (fight && !(g.escudo > 0) && g.hp > 1) { g.hp = Math.max(1, g.hp - g.maxHp * 0.0011); g.lag = Math.max(g.hp, g.lag - g.maxHp * 0.0011); } }
      if (g.escudo > 0) g.escudo--;
    }
    // objetos: el escudo (5 s sin recibir daño)
    if (fight && CFG.escudo !== false && !M.items.length && --M.itemT <= 0) { M.itemT = 60 * (12 + Math.random() * 10); M.items.push({ tipo: 'escudo', x: clamp(M.camX + 160 + Math.random() * (W - 320), 120, STAGE_W - 120), t: 0 }); }
    for (const it of M.items) {
      it.t++; if (it.t > 60 * 10 || !fight) { it.dead = true; continue; }
      const g = F.find(q => Math.abs(q.x - it.x) < q.hw + 34 && q.y > GROUND - 160); if (!g || it.t < 15) continue;
      it.dead = true; g.escudo = 300; Sound.play('heal'); M.callout(g, '¡INMUNIDAD PARLAMENTARIA!'); // 5 s sin daño: el luchador parpadea (como la estrella de los plataformas), nada que tape la pelea
    }
    M.items = M.items.filter(i => !i.dead);
    // tractorada: un tractor cruza la pantalla y arrolla a quien no salte
    if (N('tractorada') && fight) {
      if (!M.tractor && --M.tractorT <= 0) { const d = Math.random() < 0.5 ? 1 : -1; M.tractor = { dir: d, x: d > 0 ? M.camX - 660 : M.camX + W + 660, t: 0, hit: [] }; /* sale de fuera aunque la pantalla sea ancha (no depende de OX: partida en red) */ Sound.play('special'); }
      const T = M.tractor;
      if (T && ++T.t > 70) {
        T.x += T.dir * 11;
        for (const g of F) if (!T.hit.includes(g) && Math.abs(g.x - T.x) < 240 && g.y > GROUND - 120 && M.strike(nadie(T.x - T.dir * 300), g, 11, { special: true, kd: true, fromX: T.x - T.dir * 300, hx: g.x, hy: 0.4, sfx: 'heavy' }) !== null) T.hit.push(g);
        if ((T.dir > 0 && T.x > M.camX + W + 680) || (T.dir < 0 && T.x < M.camX - 680)) { M.tractor = null; M.tractorT = 60 * (6 + Math.random() * 5); }
      }
    } else if (!fight) M.tractor = null;
    // tormenta: cada poco se marca un sitio en el suelo y cae un rayo
    if (N('tormenta') && fight) {
      M.rayos = M.rayos || []; M.rayoT = (M.rayoT || 90) - 1;
      if (M.rayoT <= 0) { M.rayoT = 70 + Math.random() * 60; const g = F[Math.floor(Math.random() * 2)]; M.rayos.push({ x: clamp(g.x + (Math.random() - 0.5) * 200, 60, STAGE_W - 60), t: 0 }); }
      for (const r of M.rayos) { if (++r.t === 50) { r.dead = true; M.sfx('lightning', r.x, GROUND, { kind: 'strike', top: 0, clouds: false }); M.shake = Math.max(M.shake, 12); M.flashT = Math.max(M.flashT, 3); Sound.play('nova');
        for (const g of F) if (Math.abs(g.x - r.x) < 80 + g.hw && g.y > GROUND - 260 && g.state !== 'fall') M.strike(nadie(r.x), g, 8, { special: true, kd: true, fromX: r.x, hx: g.x, hy: 0.5, color: '#9fd8ff', sfx: 'heavy' }); } }
      M.rayos = M.rayos.filter(r => !r.dead);
    } else M.rayos = [];
    // lluvia de sobres: quien los toca llena el súper
    if (N('sobres') && fight && M.frame % 45 === 0 && M.sobres.length < 8) M.sobres.push({ x: clamp(M.camX + 80 + Math.random() * (W - 160), 60, STAGE_W - 60), y: -40, vy: 3 + Math.random() * 2, t: 0, s: Math.random() * 6 });
    // Hacienda: cada 8 s embarga media barra al que más tenga
    if (N('hacienda') && fight && --M.embargoT <= 0) { M.embargoT = 480; const g = F[0].meter >= F[1].meter ? F[0] : F[1]; if (g.meter >= 20) { g.meter = Math.floor(g.meter / 2); Sound.play('block'); M.callout(g, '¡EMBARGADO!'); } }
    // amnistía: todo lo que gana de barra, lo gana doble
    for (const g of F) { if (N('amnistia') && g.mPrev != null && g.meter > g.mPrev) g.meter = Math.min(100, g.meter + (g.meter - g.mPrev)); g.mPrev = g.meter; }
    // DANA: el suelo encharcado conserva la inercia y se patina
    if (N('dana')) for (const g of F) {
      if (g.px != null && g.grounded && ['idle', 'walk', 'crouch', 'hit', 'blockstun'].includes(g.state)) { g.slip = (g.slip || 0) * 0.95 + (g.x - g.px) * 0.07; g.x = clamp(g.x + g.slip * 1.3, 60, STAGE_W - 60); } else g.slip = 0;
      g.px = g.x;
    }
  }
  // dibujos de armas sacados de la hoja de Nano Banana (assets/vfx/arma_*.png); si no están, se pintan a mano
  const ARMA_IMG = {}; for (const k of ['misil', 'racimo', 'bomblet', 'crucero', 'nuclear', 'bio', 'boton_rojo', 'boton_verde', 'escudo', 'gas']) { const im = new Image(); im.src = V('assets/vfx/arma_' + k + '.png'); ARMA_IMG[k] = im; }
  const armaLista = k => { const im = ARMA_IMG[k]; return im && im.complete && im.naturalWidth ? im : null; };
  function pxArmaImg(k, x, y, alto, rot, flip) { // y = punta de abajo
    const im = armaLista(k); if (!im) return false; const h = alto, w = h * im.naturalWidth / im.naturalHeight, was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y - h / 2)); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); ctx.imageSmoothingEnabled = was; return true;
  }
  // botón animado (assets/vfx/boton_<color>_1..8.png): 1 tapa cerrada, 2 tapa a medio abrir, 3 tapa abierta, 4 medio hundido, 5 hundido con
  // chispas y sirena encendida, 6 sirena hacia el otro lado, 7 vuelve a subir echando humo, 8 roto. Si faltan los dibujos, el botón de siempre
  const BOTON_IMG = {}; for (const c of ['rojo', 'verde']) for (let i = 1; i <= 8; i++) { const im = new Image(); im.src = V(`assets/vfx/boton_${c}_${i}.png`); BOTON_IMG[c + i] = im; }
  function pxBotonAnim(x, y, fr, color, alto, alpha) {
    const im = BOTON_IMG[(color === 'verde' ? 'verde' : 'rojo') + fr]; if (!im || !im.complete || !im.naturalWidth) return false;
    const h = alto || 150, w = h * im.naturalWidth / im.naturalHeight, was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    if (alpha != null) ctx.globalAlpha = alpha; ctx.drawImage(im, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h)); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = was; return true;
  }
  function pxBoton(x, y, t, color, B) {
    if (B && BOTON_IMG.rojo8.naturalWidth) { // animado: sube del suelo con la tapa cerrada; la tapa se abre si alguien se acerca; al pulsarlo se hunde
      const up = Math.min(1, t / 20), b = y + (1 - up) * 150, fr = B.por ? (B.pt < 4 ? 3 : 4) : B.abre > 8 ? 3 : B.abre > 0 ? 2 : 1;
      if (Math.floor(t / 10) % 2 && fr === 1) { ctx.globalAlpha = 0.18; pxCirc(x, b - 70, 80, color === 'verde' ? '#5dff4a' : '#ff2a2a', 8); ctx.globalAlpha = 1; }
      if (pxBotonAnim(x, b + 4, fr, color)) { if (t > 20 && Math.floor(t / 10) % 2) text(color === 'verde' ? '¡PELIGRO BIOLÓGICO!' : '¡NO TOCAR!', x, b - 170, 10, color === 'verde' ? '#5dff4a' : '#ff3b30', 'center', '#000'); return; }
    }
    const up = Math.min(1, t / 20), b = y + (1 - up) * 70, on = Math.floor(t / 10) % 2, verde = color === 'verde';
    if (on) { ctx.globalAlpha = 0.25; pxCirc(x, b - 60, 80, verde ? '#5dff4a' : '#ff2a2a', 8); ctx.globalAlpha = 1; }
    if (pxArmaImg(verde ? 'boton_verde' : 'boton_rojo', x, b + 4, 130)) { if (t > 20 && on) text(verde ? '¡PELIGRO BIOLÓGICO!' : '¡NO TOCAR!', x, b - 150, 10, verde ? '#5dff4a' : '#ff3b30', 'center', '#000'); return; }
    pr(x - 54, b - 46, 108, 46, '#16161c'); pr(x - 50, b - 42, 100, 38, '#4a4d5a'); pr(x - 50, b - 42, 100, 6, '#6c7080');
    for (let i = 0; i < 6; i++) pr(x - 50 + i * 18, b - 18, 9, 12, '#ffd21a');
    pr(x - 36, b - 64, 72, 22, '#16161c'); pr(x - 32, b - 72, 64, 10, '#16161c');
    pr(x - 32, b - 62, 64, 18, verde ? (on ? '#4dff3a' : '#1fae1a') : on ? '#ff2a2a' : '#c80c14'); pr(x - 28, b - 70, 56, 10, verde ? (on ? '#8dff7a' : '#35c92a') : on ? '#ff4d4d' : '#e01a22'); pr(x - 20, b - 68, 14, 4, verde ? '#d0ffc8' : '#ffc0c0');
    if (t > 20 && on) text(verde ? '¡PELIGRO BIOLÓGICO!' : '¡NO TOCAR!', x, b - 96, 10, verde ? '#5dff4a' : '#ff3b30', 'center', '#000');
  }
  function dibujaArma(m, x, t) {
    const y = m.y, k = m.kind;
    if (k === 'misil') { if (!pxArmaImg('misil', x, y, 170)) { ctx.save(); ctx.translate(x, y); ctx.scale(1.6, 1.6); pxMisil(0, 0, t); ctx.restore(); } }
    else if (k === 'racimo') { if (!pxArmaImg('racimo', x, y, 120)) { pxCirc(x, y - 50, 46, '#141418', 6); pxCirc(x - 14, y - 64, 12, '#5a5a66', 4); pr(x - 4, y - 112, 8, 20, '#8a6a3a'); if ((t >> 2) % 2) pxCirc(x, y - 116, 8, '#ffd23a', 4); } }
    else if (k === 'bomblet') { if (!pxArmaImg('bomblet', x, y, 60)) { pxCirc(x, y - 20, 18, '#d0111f', 4); pr(x - 18, y - 24, 36, 6, '#ffffff'); } }
    else if (k === 'bio') { if (!pxArmaImg('bio', x, y, 150)) { pr(x - 22, y - 120, 44, 100, '#2f7a2a'); pr(x - 22, y - 120, 10, 100, '#5dbb4a'); pr(x - 14, y - 20, 28, 14, '#2f7a2a'); pxCirc(x, y - 70, 14, '#111', 4); pxCirc(x, y - 70, 8, '#8eea3f', 4); } }
    else if (k === 'nuclear') { if (!pxArmaImg('nuclear', x, y, 300)) { ctx.save(); ctx.translate(x, y); ctx.scale(3, 3); pxMisil(0, 0, t); ctx.restore(); } }
    else if (k === 'crucero') { if (!pxArmaImg('crucero', x, y + 28, 56, 0, m.dir < 0)) { ctx.save(); ctx.translate(x, y); ctx.rotate(-m.dir * Math.PI / 2); ctx.scale(1.4, 1.4); pxMisil(0, 40, t); ctx.restore(); } }
  }
  function pxMisil(x, y, t) {
    const fl = (t >> 1) % 2 ? 6 : 0;
    pr(x - 8, y - 104 - fl, 16, 26 + fl, '#ff8a1a'); pr(x - 4, y - 96 - fl, 8, 16 + fl, '#fff3a0');
    pr(x - 22, y - 82, 12, 22, '#5d616c'); pr(x + 10, y - 82, 12, 22, '#5d616c');
    pr(x - 12, y - 80, 24, 62, '#c9ccd4'); pr(x - 12, y - 80, 6, 62, '#eceef3'); pr(x + 6, y - 80, 6, 62, '#8d919c'); pr(x - 12, y - 52, 24, 7, '#d0111f');
    pr(x - 10, y - 18, 20, 9, '#d0111f'); pr(x - 6, y - 9, 12, 6, '#d0111f'); pr(x - 2, y - 3, 4, 3, '#7a0d0d');
  }
  // tractor de la TRACTORADA: dibujo pixel art (Gemini, estilo del coche de Aguirra) en 4 fotogramas con las ruedas girando, a ×3 como los luchadores
  // poses de reposo con las piernas en otra postura (un paso): en el vaivén de guardia parecía que el luchador bailaba (medido con herramientas: solape de piernas < 45 % con idle)
  const IB_PIERNAS = {"abalos_preso":["ib2"],"alberto":["ib2"],"almeida":["ib2"],"castro":["ib2","ib4"],"chavez":["ib2"],"errejon":["ib2"],"espinosa":["ib2","ib4"],"feijoo":["ib3"],"figaredo":["ib2"],"fujimori":["ib2"],"jigarcia":["ib2","ib4"],"kim":["ib2"],"macri":["ib2","ib4"],"macron":["ib2"],"monedero":["ib2","ib4"],"montoro":["ib2","ib4"],"nestor":["ib2"],"obama":["ib2"],"ortegasmith":["ib2"],"pujol":["ib2","ib4"],"revilla":["ib2"],"rubalcaba":["ib2","ib4"],"schwarzenegger":["ib2","ib4"],"washington":["ib2"]};
  function tractorIm(x, dir, t) {
    const im = IMG['vfx/tractor']; if (!im || !im.complete || !im.naturalWidth) return false;
    const fw = im.naturalWidth / 4, fh = im.naturalHeight, k = 3, w = fw * k, h = fh * k, f = Math.floor(t / 3) % 4, X = u => x + dir * u, bob = f % 2 ? 0 : -3;
    drawPuff(X(14) + Math.sin(t * 0.2) * 6, GROUND - h - 6 - (t % 20) * 2, 16 + (t % 20) * 0.8, (t % 20) / 20, 'negro'); // humo del tubo de escape
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(x), GROUND + 8 + bob); if (dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(NOCHE ? tinte(im, 'vfx/tractor|noche', FNOCHE) : im, f * fw, 0, fw, fh, -w / 2, -h, w, h); ctx.restore();
    text('SIN CAMPO NO HAY PAÍS', X(-101), GROUND + 8 + bob - 333, 7, '#1f5e1f', 'center');
    return true;
  }
  function pxTractor(x, dir, t, base) {
    const G = base + 4, R = (u, y, w, h, c) => pr(dir > 0 ? x + u : x - u - w, y, w, h, c), X = u => x + dir * u;
    drawPuff(X(78) + Math.sin(t * 0.2) * 6, G - 196 - (t % 20), 18 + (t % 20) * 0.6, (t % 20) / 20, 'negro');
    R(-130, G - 250, 116, 26, '#f4f4f4'); R(-130, G - 250, 116, 4, '#c8c8c8');
    R(-126, G - 222, 116, 12, '#1f5e1f'); R(-124, G - 212, 8, 104, '#1f5e1f'); R(-26, G - 212, 8, 104, '#1f5e1f'); R(-116, G - 206, 90, 62, '#9fd2ee'); R(-112, G - 202, 20, 54, '#d8f0ff');
    R(-130, G - 112, 140, 44, '#2f8a2f'); R(-14, G - 116, 136, 52, '#2f8a2f'); R(-14, G - 116, 136, 8, '#58b858'); R(114, G - 108, 12, 40, '#1b1b1b'); R(74, G - 176, 10, 64, '#333');
    R(-136, G - 132, 150, 16, '#246b24');
    pxCirc(X(-62), G - 64, 64, '#151515'); pxCirc(X(-62), G - 64, 34, '#e0b400'); pxCirc(X(-62), G - 64, 12, '#7a5a00');
    for (let i = 0; i < 8; i++) { const a = i * 0.785 + t * 0.18 * dir; pr(X(-62) + Math.cos(a) * 56 - 5, G - 64 + Math.sin(a) * 56 - 5, 10, 10, '#3a3a3a'); }
    pxCirc(X(84), G - 38, 38, '#151515'); pxCirc(X(84), G - 38, 18, '#e0b400');
    text('SIN CAMPO NO HAY PAÍS', X(-72), G - 237, 6, '#1f5e1f', 'center');
  }
  function pxSobreG(x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(1.6, 1.6); pxSobre(0, 0, s); ctx.restore(); }
  function pxSobre(x, y, s) {
    pr(x - 20, y - 26, 40, 26, '#5a4a20'); pr(x - 18, y - 24, 36, 22, '#f1e3b4');
    for (let i = 0; i < 4; i++) { pr(x - 18 + i * 4, y - 24 + i * 3, 4, 3, '#c9b57e'); pr(x + 14 - i * 4, y - 24 + i * 3, 4, 3, '#c9b57e'); }
    pr(x - 6, y - 10, 12, 6, '#3ddc6a');
  }
  // lo que va en el suelo, detrás de los luchadores
  function caosSuelo(M, cam) {
    for (const s of M.scorch || []) {
      s.t = (s.t || 0) + 1; pr(s.x - cam - s.r, GROUND + 10, s.r * 2, 14, 'rgba(18,10,6,0.55)'); pr(s.x - cam - s.r * 0.6, GROUND + 4, s.r * 1.2, 26, 'rgba(18,10,6,0.45)');
      if (s.t < 150) for (let i = 0; i < 4; i++) { const fx = s.x - cam - s.r * 0.6 + i * s.r * 0.4, fh = (10 + ((s.t * 3 + i * 17) % 14)) * (1 - s.t / 150) * 2; ctx.globalAlpha = 1 - s.t / 150; pr(fx, GROUND + 8 - fh, 8, fh, '#ff6a1a'); pr(fx + 2, GROUND + 8 - fh * 0.6, 4, fh * 0.6, '#ffd23a'); ctx.globalAlpha = 1; }
    }
    if (M.btn) pxBoton(M.btn.x - cam, GROUND + 8, M.btn.t, M.btn.color, M.btn);
    if (M.btnAnim) { // después de pulsarlo: hundido con la sirena girando, vuelve a subir echando humo y se hunde en el suelo
      const A = M.btnAnim, u = A.t, fr = u < 70 ? (Math.floor(u / 6) % 2 ? 6 : 5) : u < 110 ? 7 : 8, baja = Math.max(0, u - 110) * 3;
      if (u < 70 && u % 12 < 6) { ctx.globalAlpha = 0.22; pxCirc(A.x - cam, GROUND - 110, 120, A.color === 'verde' ? '#5dff4a' : '#ff2a2a', 8); ctx.globalAlpha = 1; }
      ctx.save(); ctx.beginPath(); ctx.rect(-10, -10, W + 20, GROUND + 18); ctx.clip(); pxBotonAnim(A.x - cam, GROUND + 12 + baja, fr, A.color, 150, u > 130 ? Math.max(0, 1 - (u - 130) / 20) : null); ctx.restore();
    }
    for (const it of M.items || []) { const x = it.x - cam, y = GROUND - 60 + Math.sin(it.t * 0.1) * 8, on = it.t > 480 && Math.floor(it.t / 6) % 2; if (on) continue; if (!pxArmaImg('escudo', x, y + 40, 80)) { pxCirc(x, y, 34, '#1b4f9c', 6); pxCirc(x, y, 26, '#39a0ff', 6); pxCirc(x - 8, y - 8, 8, '#d8f0ff', 4); } text('INMUNIDAD', x, y - 54, 8, '#9fd8ff', 'center', '#000'); }
    for (const z of M.gas || []) if (!(window.SF_VFX && window.SF_VFX.poison)) { ctx.globalAlpha = 0.45 * Math.min(1, (z.life - z.t) / 60); for (let i = 0; i < 6; i++) pxCirc(z.x - cam + (hash(i * 3.3) - 0.5) * 200, GROUND - 40 - hash(i * 7.1) * 120 - Math.sin(z.t * 0.05 + i) * 10, 40 + hash(i) * 30, '#6fd83a', 8); ctx.globalAlpha = 1; }
    for (const s of M.sobres || []) pxSobreG(s.x - cam + Math.sin(s.t * 0.15 + s.s) * (s.y < GROUND - 12 ? 10 : 0), s.y, s.s);
    if (M.news && M.news.id === 'dana') pr(0, GROUND + 6, W, 8, 'rgba(140,180,255,0.22)');
  }
  // lo que va delante: misiles con su diana en el suelo y el tractor
  function caosAire(M, cam) {
    for (const f of M.f) if (f.veneno > 0) for (let i = 0; i < 4; i++) { const b = (M.newsT * 1.5 + i * 25) % 100; ctx.globalAlpha = 1 - b / 100; pxCirc(f.x - cam + Math.sin(i * 2 + M.newsT * 0.1) * 40, f.y - f.def.height * 0.9 - b, 6 + (i % 2) * 4, '#8eea3f', 4); ctx.globalAlpha = 1; }
    for (const f of M.f) if (false && f.escudo > 0) { ctx.globalAlpha = 0.35; ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(f.x - cam, f.y - f.def.height * 0.5, f.def.height * 0.45, f.def.height * 0.6, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    for (const f of M.f) if (f.bulo > 0 && Math.floor(f.bulo / 8) % 2) text('¡BULO!', f.x - cam, f.y - f.def.height - 30, 14, '#ff7a3a', 'center', '#000');
    for (const m of M.misiles || []) {
      const x = m.x - cam, on = Math.floor(M.newsT / 4) % 2;
      if (m.kind === 'crucero') { // aviso en el borde y luego el misil a ras de suelo
        if (m.warn > 0) { if (on) { const ex = m.dir > 0 ? 60 : W - 60; text(m.dir > 0 ? '>>> ¡SALTA!' : '¡SALTA! <<<', ex + m.dir * 90, GROUND - 120, 14, '#ff3b30', 'center', '#000'); } continue; }
        for (let k = 1; k <= 5; k++) { ctx.globalAlpha = 0.5 - k * 0.08; pxCirc(x - m.dir * (60 + k * 30), m.y - 6, 8 + k * 3, k < 2 ? '#ff9a3a' : '#9a96a0', 4); } ctx.globalAlpha = 1;
        dibujaArma(m, x, M.newsT); continue;
      }
      if (m.kind === 'nuclear') { const k = clamp((m.y + 320) / (GROUND + 320), 0, 1); ctx.globalAlpha = 0.25 + k * 0.5; pr(x - 340, GROUND + 2, 680, 6, on ? '#ffe14a' : '#ff3b30'); ctx.globalAlpha = 1; if (on) text('¡ZONA DE IMPACTO!', x, GROUND - 20, 12, '#ffe14a', 'center', '#000'); }
      const k = clamp((m.y + 160) / (GROUND + 160), 0, 1), r = Math.round((m.kind === 'bomblet' ? 40 : 70) - k * 30);
      ctx.globalAlpha = 0.5 + k * 0.5; pr(x - r, GROUND + 2, r * 2, 4, on ? '#ff3b30' : '#ffe14a'); pr(x - 2, GROUND - 10, 4, 24, '#ff3b30'); ctx.globalAlpha = 1;
      if (m.kind !== 'bio' && m.kind !== 'racimo') for (let k = 1; k <= 6; k++) { const ty = m.y - 150 - k * 26, a = 0.55 - k * 0.08; if (ty < -60) continue; ctx.globalAlpha = a; pxCirc(x + Math.sin((M.newsT + k * 7) * 0.4) * 4, ty, 10 + k * 3, k < 2 ? '#ff9a3a' : '#9a96a0', 4); } ctx.globalAlpha = 1;
      dibujaArma(m, x, M.newsT);
    }
    for (const r of M.rayos || []) { const on = Math.floor(r.t / 4) % 2, x = r.x - cam, k = r.t / 50; pr(x - 70 * (1 - k * 0.4), GROUND + 2, 140 * (1 - k * 0.4), 6, on ? '#9fd8ff' : '#ffffff'); pr(x - 3, GROUND - 40 * k, 6, 40 * k, 'rgba(159,216,255,0.6)'); }
    const T = M.tractor;
    if (T) {
      if (T.t <= 70) { if (Math.floor(T.t / 8) % 2) { const ex = T.dir > 0 ? 70 - OX : W + OX - 70; text('¡TRACTOR!', ex + (T.dir > 0 ? 70 : -70), GROUND - 160, 14, '#ffe14a', 'center', '#000'); pr(T.dir > 0 ? 20 - OX : W + OX - 60, GROUND - 120, 40, 40, '#ffe14a'); } }
      else if (!tractorIm(T.x - cam, T.dir, T.t)) { ctx.save(); ctx.translate(T.x - cam, GROUND + 6); ctx.scale(1.3, 1.3); pxTractor(0, T.dir, T.t, 0); ctx.restore(); }
    }
  }
  // capas sobre toda la escena: apagón, lluvia de la DANA y la sirena del botón rojo
  function caosCapa(M, cam) {
    const N = id => M.news && M.news.id === id, t = M.newsT;
    if (M.apagado()) { // solo oscuro: sin focos alrededor de los luchadores (el escenario de noche ya pone el tono)
      ctx.fillStyle = nocheDe(M.stage) ? 'rgba(2,2,14,0.28)' : 'rgba(2,2,14,0.6)'; ctx.fillRect(-OX, 0, VW, H);
    }
    if (N('dana')) {
      ctx.fillStyle = 'rgba(16,28,64,0.38)'; ctx.fillRect(-OX, 0, VW, H);
      ctx.fillStyle = 'rgba(205,228,255,0.75)';
      for (let i = 0; i < 220; i++) { const x = ((hash(i * 3.1) * 1900 + t * 5) % 1900) - 310, y = ((hash(i * 7.7) * 820 + t * (24 + hash(i) * 10)) % 820) - 90; ctx.fillRect(Math.round(x), Math.round(y), 4, 30); }
      for (let i = 0; i < 18; i++) { const x = hash(i * 9.3 + Math.floor(t / 10)) * W, k = (t % 10) / 10; ctx.fillRect(Math.round(x - 6 - k * 8), GROUND + 6 - k * 8, 4, 4); ctx.fillRect(Math.round(x + 4 + k * 8), GROUND + 6 - k * 8, 4, 4); }
    }
    if (M.alarm && M.alarm.t < 340) {
      const A = M.alarm; ctx.fillStyle = `rgba(255,0,0,${(Math.sin(A.t * 0.3) * 0.5 + 0.5) * 0.2})`; ctx.fillRect(-OX, 0, VW, H);
      if (A.t < 70 && Math.floor(A.t / 8) % 2) text('¡ALERTA NUCLEAR!', W / 2, 190, 34, '#ff3b30', 'center', '#000');
    }
  }
  // rótulo de ÚLTIMA HORA: grande al empezar el asalto y pequeño abajo mientras se pelea
  function caosTicker(M) {
    const n = M.news; if (!n) return;
    if (M.phase === 'intro') {
      const e = 1 - Math.pow(1 - Math.min(1, M.pt / 14), 3), dx = (1 - e) * -W;
      pr(dx, 470, W, 104, 'rgba(0,0,0,0.82)'); pr(dx, 470, W, 4, '#d0111f'); pr(dx, 570, W, 4, '#d0111f');
      pr(dx + 40, 484, 250, 44, '#d0111f'); text('ÚLTIMA HORA', dx + 165, 506, 16, '#fff', 'center');
      text(n.t, dx + 320, 506, 24, '#ffe14a', 'left', '#000'); text(n.s, dx + 320, 548, 12, '#fff', 'left', '#000');
    } else if (M.phase === 'fight') {
      const w = 520, x = W / 2 - w / 2, y = H - 50;
      pr(x, y, w, 30, 'rgba(0,0,0,0.8)'); pr(x, y, 128, 30, '#d0111f'); text('ÚLTIMA HORA', x + 64, y + 15, 8, '#fff', 'center'); text(n.t, x + 140, y + 15, 11, '#ffe14a', 'left');
    }
  }

  class Match {
    constructor(d1, d2, stage, mode, level, al1, al2) {
      this.mode = mode; this.stage = stage; this.level = level || 0;
      this.f = [new Fighter(d1, 560, 1, mode === 'demo', 4), new Fighter(d2, 1140, -1, mode !== 'versus', level)];
      for (const x of this.f) if (x.def.super && x.def.super.objeto) { famHoja(x.def.super.objeto); if (x.def.super.desviste) { famHoja(x.def.super.desviste); famHoja(x.def.super.objeto + '_rota'); famHoja(x.def.super.objeto + '_aturdido'); famHoja(x.def.super.objeto + '_anda'); } if (x.def.super.familia === 'sismo') famHoja(x.def.super.pilar || 'pilar'); } // la hoja del súper, lista antes de usarlo
      this.round = 1; this.camX = (STAGE_W - W) / 2; this.projs = []; this.fx = []; this.calls = []; this.assists = [];
      // cada luchador entra con su aliado: el que eligió el jugador o, para la CPU, uno afín al azar
      this.f[0].allyDef = al1 || cpuAlly(d1, d2); this.f[1].allyDef = al2 || cpuAlly(d2, d1);
      this.res = [0, 1].map(i => this.reserve(i)); this.tagCd = [0, 0];
      this.shake = 0; this.stop = 0; this.freeze = null; this.sup = null; this.combo = null; this.flashT = 0; this.startRound();
    }
    startRound() {
      this.f[0].reset(STAGE_W / 2 - 290, 1); this.f[1].reset(STAGE_W / 2 + 290, -1);
      if (this.res) { this.res.forEach((r, i) => { if (r) r.reset(STAGE_W / 2 + (i ? 290 : -290), i ? -1 : 1); }); this.tagCd = [0, 0]; }
      this.projs = []; this.fx = []; this.assists = []; this.sup = null; this.thrown = []; this.restos = []; this.jet = null; this.blood = []; this.fin = null; this.pools = []; this.osos = []; this.f.forEach(f => { f.fat = null; f.fpose = null; });
      this.props = (STAGE_PROPS[this.stage] || []).filter(p => PROPS[p[0]]).map(p => ({ name: p[0], x: p[1] }));
      this.time = (this.tiempoAsalto || 99) * 60; this.phase = 'intro'; this.pt = 0; this.banner = ''; this.sub = '';
      // tras un empate (doble K.O. o tiempo con la misma vida) el asalto no cuenta para nadie y se juega otro: asalto de desempate
      const last = this.f[0].wins === 1 && this.f[1].wins === 1;
      this.say(last ? 'Asalto final' : this.draws && this.f[0].wins === this.f[1].wins ? 'Asalto de desempate' : 'Asalto ' + this.round);
      caosRonda(this);
    }
    say(s) { this.banner = s.toUpperCase(); this.bt = 0; Sound.voice(VO[s]); }
    callout(f, s) { this.calls = this.calls.filter(c => c.f !== f); this.calls.push({ f, s, t: 0 }); } /* un rótulo por luchador: el nuevo sustituye al anterior en vez de pisarlo */
    // el aliado también lucha: espera en la reserva recuperando vida y entra con ABAJO + ALIADO, o solo si cae el líder
    reserve(i) { const f = this.f[i], d = f.allyDef; if (!d || !META[d.id]) return null; const r = new Fighter(d, f.x, f.dir, f.cpu, f.level); r.allyDef = f.def; return r; }
    canTag(f) { const i = this.f.indexOf(f), r = this.res[i]; return i >= 0 && !!r && r.hp > 0 && this.tagCd[i] <= 0 && this.phase === 'fight' && f.grounded && !this.sup && !this.freeze; }
    tag(f, forced) {
      const i = this.f.indexOf(f), r = this.res[i]; if (i < 0 || !r) return;
      const x = clamp(f.x - f.dir * (forced ? 170 : 230), this.camX + 80, this.camX + W - 80);
      r.set('jump');
      Object.assign(r, { x, y: GROUND - (forced ? 280 : 230), vx: forced ? 0 : f.dir * 9, vy: forced ? 2 : -3, dir: f.dir, move: null, invul: 45, wins: f.wins, meter: f.meter, assistCd: Math.max(f.assistCd, 240), trail: [], flash: 6, lag: r.hp, fat: null, fpose: null, held: null });
      if (!forced) { // entra pegando (como el crossover de Marvel vs Capcom): patada aérea que tumba
        f.set('idle'); f.vx = 0;
        Object.assign(r, { moveName: 'air', move: Object.assign({}, BASE.air, { dmg: 10, kd: true, ac: 26, push: 10 }), buf: {}, connected: false, hitDone: false, mt: 0 });
      }
      this.res[i] = f; this.f[i] = r; this.tagCd[i] = 120;
      this.assists = this.assists.filter(a => a.owner !== f);
      this.spark(r.x, GROUND - r.def.height * 0.5, '#ffffff', 14); this.shake = Math.max(this.shake, 6); Sound.play('whoosh'); Sound.voice('nombre_' + r.id); this.callout(r, '¡CAMBIO: ' + r.def.name + '!');
    }
    callAssist(f, opp) {
      const def = f.allyDef; if (!def) return;
      const rv = this.res[this.f.indexOf(f)]; if (rv && rv.hp <= 0) return; // el aliado está K.O.
      this.assists.push(new Assist(f, def)); f.assistCd = ASSIST_CD * (f.assistMul || 1); if (def.sp2.type === 'falcon') this.jet = { x: f.x - f.dir * 1000, y: 150, dir: f.dir, t: 0 };
      this.callout(f, '¡APOYO: ' + def.name + '!'); Sound.play('special'); Sound.voice('nombre_' + def.id);
    }
    propNear(f) { return this.props.find(p => Math.abs(p.x - f.x) < 90) || null; }
    takeProp(p) { this.props = this.props.filter(q => q !== p); Sound.play('blip'); return p.name; }
    throwProp(f) { this.thrown.push({ owner: f, name: f.held, x: f.x + f.dir * 50, y: f.y - f.def.height * 0.75, vx: f.dir * 16, vy: -5, rot: 0 }); Sound.play('whoosh'); }
    superFreeze(f) { this.sfx('energy', f.x, f.y - f.def.height * 0.55, { kind: 'charge', charge: 1.1 }); this.freeze = { f, t: 0 }; Sound.play('super'); if (f.def.super.voz) Sound.voice(f.def.super.voz); }
    superFire(f, opp) {
      const s = f.def.super; Sound.play('nova'); this.shake = 18; this.flashT = 6;
      this.sup = { f, opp, type: s.type, color: s.fx, t: 0, dur: BASE.super.ac - 4, hits: 0, locked: false, parts: [] };
      // familias de súper con objeto dibujado (SUPERS-PROPUESTA.md): lluvia que estalla, carga que cruza, caída gigante. La jugada no depende de
      // si la hoja ya está cargada (en online los dos ordenadores tienen que simular lo mismo): sin hoja solo cambia el dibujo
      if (s.familia && CFG.superFamilias !== false) { this.sup.type = s.familia === 'carga' ? 'estampida' : s.familia; famHoja(s.objeto); }
      if (s.kombo && f.m.k8) { this.sup.type = 'kombo'; f.kpose = 'k2'; }
      const G = GUION(f.id); if (G && G.super && f.m.os1) Object.assign(this.sup, { type: 'guion', G: G.super, P: [], hoja: 's' });
      if (s.heal) { f.hp = Math.min(f.maxHp, f.hp + f.maxHp * s.heal); f.lag = f.hp; Sound.play('heal'); for (let i = 0; i < 14; i++) this.fx.push({ type: 'plus', x: f.x + rand(-60, 60), y: f.y - rand(40, f.def.height), vy: -rand(1, 3), t: 0, life: 40 }); }
    }
    updateSuper() {
      const S = this.sup, f = S.f, o = S.opp, s = f.def.super; S.t++;
      if (f.state !== 'attack') { if (S.type === 'oso' || S.type === 'sismo') f.y = GROUND; if (S.squash) S.squash.fat = null; if (S.vic) this.komboSuelta(S, f, false); this.sup = null; return; }
      const inArea = S.type === 'beam' ? (o.x - f.x) * f.dir > -30 : S.type === 'nova' ? Math.abs(o.x - f.x) < 700 : true;
      const tumbado = o.state === 'down' || o.state === 'getup'; // el súper también castiga al que está en el suelo o levantándose: quien no se cubre, algo se lleva
      const can = inArea && (o.invul <= 0 || o.wakeT > 0) && !tumbado && !['dead', 'win'].includes(o.state);
      if (S.type === 'guion') return this.guionSuperStep(S, f, o, s, can);
      if (S.type === 'kombo') return this.komboStep(S, f, o, s, can);
      if (S.type === 'estampa') return this.estampaStep(S, f, o, s, can);
      if (S.type === 'estampida' && s.familia === 'carga' && s.choque !== false) return this.cargaStep(S, f, o, s, can);
      if (S.type === 'estampida') return this.estampidaStep(S, f, o, s, can);
      if (S.type === 'lluvia') return this.lluviaStep(S, f, o, s, can);
      if (S.type === 'caida') return this.caidaStep(S, f, o, s, can);
      if (S.type === 'sismo') return this.sismoStep(S, f, o, s, can);
      if (S.type === 'oso') return this.osoStep(S, f, o, s, can);
      if (S.type === 'rain' && s.cachorros) { if (S.t < S.dur - 10 && S.t % 2 === 0) S.parts.push({ x: o.x + rand(-520, 520), y: -90 - rand(0, 60), vx: rand(-1.5, 1.5), vy: rand(11, 16), rot: rand(-0.25, 0.25), s: rand(92, 138), k: 1 + Math.floor(rand(0, 8)), dir: Math.random() < 0.5 ? 1 : -1 }); }
      else if (S.type === 'rain' && S.t < S.dur - 10) for (let i = 0; i < 2; i++) S.parts.push({ x: o.x + rand(-460, 460) - f.dir * 240, y: -80 - rand(0, 60), vx: f.dir * 9, vy: 30, rot: rand(0, 6), s: rand(64, 118) });
      if (S.type === 'nova' && S.t % 4 === 0 && S.t < S.dur - 10) S.parts.push({ x: clamp(o.x + rand(-320, 320), 40, STAGE_W - 40), t: 0 });
      for (const p of S.parts) {
        if (S.type === 'rain' && s.cachorros) { p.x += p.vx; p.y += p.vy; if (p.run) { p.vy += 1.2; if (p.y > GROUND - p.s * 0.36) { p.y = GROUND - p.s * 0.36; p.vy = -5; } if (p.x < this.camX - 200 || p.x > this.camX + W + 200) p.dead = true; } else if (p.y > GROUND - p.s * 0.36) { p.run = true; p.vy = -9; p.vx = p.dir * rand(7, 12); p.rot = 0; this.spark(p.x, GROUND - 8, '#ffffff', 3); } }
        else if (S.type === 'rain') { p.x += p.vx; p.y += p.vy; p.rot += 0.3; if (p.y > GROUND - 10) { p.dead = true; if (Math.random() < 0.4) this.spark(p.x, GROUND - 10, S.color, 5); } }
        else if (++p.t > 16) p.dead = true;
      }
      S.parts = S.parts.filter(p => !p.dead);
      this.shake = Math.max(this.shake, 4);
      if (S.t % 8 === 0 && S.t < S.dur - 12 && tumbado && inArea && o.hp > 0) { // sigue en el suelo: menos daño que de pie y no lo interrumpe
        S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.03); o.flash = 3; this.spark(o.x + rand(-50, 50), o.y - o.hh * rand(0.2, 0.8), S.color, 6); Sound.play('hit'); this.combo = { n: S.hits, left: f === this.f[0], t: 0 };
      }
      if (S.t % 8 === 0 && S.t < S.dur - 12 && can) {
        const blocked = !S.locked && o.guard && (o.free || o.state === 'blockstun');
        o.dir = f.x >= o.x ? 1 : -1;
        if (blocked) { o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.012); o.set('blockstun'); o.stunT = 10; this.spark(o.x + o.dir * 30, o.y - o.hh * 0.6, '#9fd8ff', 5); Sound.play('block'); }
        else {
          S.locked = true; S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.045);
          o.set('hit'); o.hitPose = S.hits % 2 && o.m.hit2 ? 'hit2' : 'hit'; o.stunT = 14; o.vx = -o.dir * 1.2; o.vy = 0; o.flash = 3;
          this.spark(o.x + rand(-40, 40), o.y - o.hh * rand(0.3, 0.9), S.color, 8); Sound.play('hit'); this.combo = { n: S.hits, left: f === this.f[0], t: 0 };
        }
      }
      if (S.t === S.dur - 6) {
        this.flashT = 10; this.shake = 26; Sound.play('nova'); this.boom(o.x, o.y - o.hh * 0.5, S.color); // sin el rayo que caía al final de todos los súper (Gastón: «rayos sueltos»)
        if (tumbado && inArea && o.hp > 0) { S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.25); o.flash = 4; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; }
        if (can && (o.invul = 0, true) && this.strike(f, o, s.dmg * f.def.power * 0.5, { special: true, kd: true, color: S.color, fromX: f.x, hx: o.x })) { S.hits++; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; }
      }
      if (S.t >= S.dur) this.sup = null;
    }
    // golpe de un objeto de súper de familia (lluvia, caída): como la estampida, de pie, cubriéndose o en el suelo. k = parte del daño del súper
    famGolpe(S, f, o, s, can, k, hx) {
      if ((o.state === 'down' || o.state === 'getup') && o.hp > 0) { S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * k * 0.5); o.flash = 3; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; return; }
      if (!can) return;
      const blocked = !S.locked && o.guard && (o.free || o.state === 'blockstun'); o.dir = f.x >= o.x ? 1 : -1;
      if (blocked) { o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.012); o.set('blockstun'); o.stunT = 8; this.spark(o.x + o.dir * 30, o.y - o.hh * 0.6, '#9fd8ff', 5); Sound.play('block'); return; }
      S.locked = true; S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * k);
      o.set('hit'); o.hitPose = S.hits % 2 && o.m.hit2 ? 'hit2' : 'hit'; o.stunT = 16; o.flash = 3; o.vx = (o.x >= hx ? 1 : -1) * 2;
      this.spark(o.x + rand(-30, 30), o.y - o.hh * rand(0.3, 0.8), S.color, 7); Sound.play(S.hits % 3 ? 'hit' : 'heavy'); this.combo = { n: S.hits, left: f === this.f[0], t: 0 };
    }
    // LLUVIA QUE ESTALLA (Zapatero: joyas): caen objetos dando vueltas y al tocar el suelo estallan como un misil pequeño.
    // Un tercio cae sobre el rival y el resto repartido: hace daño lo que revienta cerca de él (se puede esquivar al principio)
    lluviaStep(S, f, o, s, can) {
      const J = S.parts;
      if (S.t < S.dur - 16 && S.t % 3 === 0) { const sobre = S.t % 9 === 0; J.push({ x: clamp(sobre ? o.x + rand(-60, 60) : o.x + rand(-430, 430), 40, STAGE_W - 40), y: -70 - rand(0, 90), vx: rand(-1.6, 1.6), vy: rand(6, 10), rot: rand(0, 6), vr: rand(-0.22, 0.22), k: Math.floor(rand(0, 8)), s: rand(56, 80), t: 0 }); }
      for (const j of J) {
        j.t++; j.vy += 0.55; j.x += j.vx; j.y += j.vy; j.rot += j.vr;
        if (j.y >= GROUND - 6) {
          j.dead = true; const size = 0.55 + rand(0, 0.2);
          this.fx.push({ type: 'mboom', x: j.x, y: GROUND - 70 * size / 1.5, t: 0, life: 300, seed: rand(0, 1000), size });
          this.spark(j.x, GROUND - 20, s.objeto === 'joyas' ? JOYA_COL[j.k % JOYA_COL.length] : S.color, 6); this.shake = Math.max(this.shake, 9);
          if (this.scorch) { this.scorch.push({ x: j.x, r: 16 + rand(0, 10) }); if (this.scorch.length > 26) this.scorch.shift(); }
          if (rand(0, 1) < 0.4) Sound.play(rand(0, 1) < 0.3 ? 'nova' : 'heavy');
          if (Math.abs(j.x - o.x) < 60 + o.hw && (S.nG = (S.nG || 0) + 1) <= 10) this.famGolpe(S, f, o, s, can, 0.06, j.x); // (0,06: con 0,07 salía un 20 % por encima de su «nova») tope de 10 golpes: si no, con suerte pasaba de 50 de daño
        }
      }
      S.parts = J.filter(j => !j.dead);
      if (S.t === S.dur - 6 && S.hits && can && (o.invul = 0, true) && this.strike(f, o, s.dmg * f.def.power * 0.45, { special: true, kd: true, color: S.color, fromX: f.x, hx: o.x })) { S.hits++; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; }
      if (S.t >= S.dur) this.sup = null;
    }
    // CAÍDA GIGANTE (como el Falcon de Sanxe, con el objeto de cada uno): cae del cielo siguiendo al rival, se clava y lo deja tumbado
    caidaStep(S, f, o, s, can) {
      if (S.t === 1) { S.cx = o.x; S.cy = -420; S.vy = 6; }
      if (!S.hit) {
        S.cx += (o.x - S.cx) * 0.08; S.vy += 1.4; S.cy += S.vy; this.shake = Math.max(this.shake, Math.min(10, S.t / 6));
        if (S.cy >= GROUND) {
          S.hit = S.t; S.cy = GROUND; this.shake = 34; this.flashT = 8; Sound.play('nova'); Sound.play('heavy'); this.boom(S.cx, GROUND - 60, S.color);
          S.bits = []; for (let i = 0; i < 30; i++) S.bits.push({ x: S.cx + rand(-90, 90), y: GROUND - rand(10, 60), vx: rand(-9, 9), vy: -rand(6, 16), s: rand(5, 12) });
          if (this.scorch) this.scorch.push({ x: S.cx, r: 60 });
          const cerca = Math.abs(o.x - S.cx) < (s.ancho || 150) + o.hw;
          if ((o.state === 'down' || o.state === 'getup') && o.hp > 0 && cerca) { S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.6); o.flash = 4; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; }
          else if (can && cerca && this.strike(f, o, s.dmg * f.def.power * 1.0, { special: true, kd: true, color: S.color, fromX: S.cx, hx: o.x })) { S.hits++; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; if (CFG.sangre !== false) this.bleed(o.x, o.y - o.hh * 0.5, 0, 16, true); }
        }
      } else {
        const u = S.t - S.hit;
        for (const b of S.bits || []) { if (b.st) continue; b.vy += 0.7; b.x += b.vx; b.y += b.vy; if (b.y >= GROUND - 4) { b.y = GROUND - 4; if (Math.abs(b.vy) < 3) b.st = true; b.vy *= -0.3; b.vx *= 0.5; } }
        S.cy = GROUND + (u < 10 ? Math.sin(u / 10 * Math.PI) * -14 : 0) + Math.max(0, u - 56) * 1.6; // rebota al clavarse y al final se hunde
      }
      if (S.t >= S.dur) this.sup = null;
    }
    // TERREMOTO: salta, cae a plomo y golpea el suelo; una grieta corre por el suelo reventando adoquines hasta el rival y bajo sus pies
    // revienta una erupción grande que lo lanza por los aires. Si salta a tiempo, se libra (la grieta va por el suelo)
    // familia sismo (Gastón, 12-nov: «como Hulk en Marvel vs Capcom, tal cual»): salta, cae a plomo con el puño contra el suelo y el suelo revienta
    // en TRES pilares de roca seguidos, cada uno más alto, avanzando hacia el rival; el último le sale debajo y lo lanza por los aires.
    // Pilar: hoja 4x2 assets/vfx/pilar.webp (8 fotogramas sin deformar); polvo y adoquines: assets/vfx/sismo.webp
    sismoStep(S, f, o, s, can) {
      const d = f.dir, CADA = 6;
      if (S.t < 16) f.y = GROUND - Math.round(Math.sin(S.t / 16 * Math.PI) * 130);
      if (S.t === 16) {
        f.y = GROUND; S.x0 = f.x + d * 50; this.shake = 30; this.flashT = 6; Sound.play('heavy'); Sound.play('nova'); this.boom(S.x0, GROUND - 30, S.color); this.sismoRocas(S, S.x0, 10, 14);
        if (this.scorch) this.scorch.push({ x: S.x0, r: 50 });
        // Gastón (12-nov): que llegue el doble de lejos. La hilera sigue más allá del rival hasta el doble de su distancia (de 700 a 1.800 px);
        // uno de los pilares cae justo debajo de él. Cuantos más metros, más pilares (uno cada ~180 px, máx. 9)
        const dist = clamp((o.x - f.x) * d, 90, 1800), x0 = Math.min(120, dist * 0.4), largo = clamp(dist * 2, 700, 1800);
        const iR = Math.max(2, Math.round((dist - x0) / 180)), paso = (dist - x0) / iR, n = Math.min(9, Math.floor((largo - x0) / paso) + 1);
        S.pil = []; for (let i = 0; i < n; i++) { const x = f.x + d * (x0 + i * paso); if (x < 0 || x > STAGE_W) break; S.pil.push({ x, t: 16 + 6 + i * CADA, alto: Math.min(420, 250 + i * 60), i }); }
      }
      for (const p of S.pil || []) {
        const u = S.t - p.t;
        if (u === 0) { this.shake = Math.min(34, 18 + 6 * p.i); this.flashT = 3; Sound.play('heavy'); Sound.play('choque'); this.boom(p.x, GROUND - 20, '#ff8a3c'); /* sin la explosión a media altura: con la hoja del pilar, lo tapaba entero */ this.sismoRocas(S, p.x, 14, 18); }
        if (u === 6 && !S.dio) { // el pilar ya asoma entero: pega si el rival está encima y en el suelo (saltando lo esquiva, como en el original)
          const encima = Math.abs(o.x - p.x) < 80 + o.hw, suelo = o.y >= GROUND - 2;
          if (encima && suelo && (o.state === 'down' || o.state === 'getup') && o.hp > 0) { S.dio = true; S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.5); o.flash = 4; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; }
          else if (encima && suelo && can) {
            S.dio = true; o.invul = 0;
            if (this.strike(f, o, s.dmg * f.def.power * 0.95, { special: true, kd: true, launch: true, color: S.color, fromX: p.x - d * 40, hx: o.x, push: 6 })) {
              S.hits++; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; o.vy = -24; // sale despedido hacia arriba con el pilar
              if (CFG.sangre !== false) { this.bleed(o.x, o.y - o.hh * 0.4, d, 18, true); this.sfx('blood', o.x, o.y - o.hh * 0.5, { angle: -Math.PI / 2, amount: 1.3, size: 1.2 }, 'sangre'); }
            }
            this.sfx('impact', o.x, GROUND - 60, { angle: -Math.PI / 2, size: 1.8 });
          }
        }
        if (u > 6 && u < 24 && u % 4 === 0) this.sismoRocas(S, p.x, 3, 10);
      }
      for (const b of S.rocas || []) { if (b.st) continue; b.vy += 0.9; b.x += b.vx; b.y += b.vy; b.rot += b.vr; if (b.y >= GROUND - 2) { b.y = GROUND - 2; if (Math.abs(b.vy) < 4) b.st = true; b.vy *= -0.3; b.vx *= 0.5; b.vr *= 0.5; } }
      if (S.t >= S.dur) { f.y = GROUND; this.sup = null; }
    }
    // OSO (Putin; Gastón, 12-nov): se arranca chaqueta y camisa, cabalga a pecho descubierto un oso contra el rival, salta del oso
    // vistiéndose en el aire y el oso se estampa contra el rival. Hojas 4x2: <objeto>.webp (oso con jinete 0-3, oso solo 4-7),
    // <objeto>_rota.webp (el oso estampado, mareado) y <desviste>.webp (desvistiéndose 0-3, vistiéndose en el salto 4-7).
    // Como en el resto de familias, la jugada no depende de que las hojas estén cargadas (online): sin hojas solo cambia el dibujo
    osoStep(S, f, o, s, can) {
      const d = f.dir, L = s.largo || 420, SALTO = 26;
      if (S.t === 1) { S.dur = 124; S.esconde = true; S.x0 = f.x; famHoja(s.objeto + '_rota'); famHoja(s.objeto + '_aturdido'); famHoja(s.desviste); if (s.grito) this.callout(f, s.grito); }
      if (S.t === 20) { // salta fuera de plano y vuelve montado en el oso desde atrás, cruzando la pantalla (Gastón: «que cabalgue contra el adversario»)
        const x0 = d > 0 ? this.camX - L / 2 - 20 : this.camX + W + L / 2 + 20;
        S.oso = { x: x0, v: 26, solo: false, para: false, golpe: false, u: 0 }; this.boom(f.x, GROUND - 30, '#c8b89a'); Sound.play('whoosh');
      }
      if (S.oso && !S.rugio && (S.oso.x - this.camX) * d > -L / 2 + (d > 0 ? 0 : -W)) { S.rugio = true; this.shake = 12; Sound.play('heavy'); }
      const B = S.oso;
      if (B && !B.para) {
        B.x += d * B.v; if (B.v < 32) B.v += 0.6;
        if (!B.solo) {
          if ((B.x - S.x0) * d >= 0) { B.monta = true; f.x = clamp(B.x, 40, STAGE_W - 40); } // la cámara le sigue cuando ya ha pasado por donde estaba
          if ((o.x - B.x) * d < L / 2 + o.hw + 150 || S.t > 96 || (B.x < 60 && d < 0) || (B.x > STAGE_W - 60 && d > 0)) { B.solo = true; S.salto = { t: S.t, x: f.x }; Sound.play('whoosh'); } // salta del oso a un paso del rival
        }
        if (!B.golpe && ((B.x + d * L / 2) - (o.x - d * o.hw)) * d >= 0) {
          B.golpe = true; const tumb = (o.state === 'down' || o.state === 'getup') && o.hp > 0;
          if (S.fatal) { B.para = true; B.u = S.t; B.x = o.x - d * (o.hw + L / 2); this.osoSuelta(B, d, s); S.choque = S.t; this.shake = 30; this.flashT = 8; Sound.play('choque'); Sound.play('heavy'); this.boom(o.x - d * o.hw, GROUND - 120, S.color); }
          else if (can && o.y >= GROUND - 40) {
            B.para = true; B.u = S.t; B.x = o.x - d * (o.hw + L / 2); this.osoSuelta(B, d, s); this.shake = 30; this.flashT = 6; this.stop = 6; Sound.play('choque'); Sound.play('heavy'); this.boom(o.x - d * o.hw, GROUND - 120, S.color);
            o.invul = 0; if (this.strike(f, o, s.dmg * f.def.power * 0.95, { special: true, kd: true, color: S.color, fromX: B.x, hx: o.x, push: 14 })) {
              S.hits++; this.combo = { n: S.hits, left: f === this.f[0], t: 0 };
              if (CFG.sangre !== false) { this.bleed(o.x, o.y - o.hh * 0.5, d, 20, true); this.sfx('blood', o.x, o.y - o.hh * 0.5, { angle: d > 0 ? -0.35 : Math.PI + 0.35, amount: 1.3, size: 1.2 }, 'sangre'); }
            }
          } else if (tumb) { S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.4); o.flash = 4; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; } // tumbado: le pasa por encima
        }
      }
      if (S.salto) { // salta hacia atrás y arriba, vistiéndose en el aire, y cae de pie
        const u = Math.min(SALTO, S.t - S.salto.t);
        f.x = clamp(S.salto.x - d * 90 * (u / SALTO), 40, STAGE_W - 40); f.y = GROUND - Math.round(Math.sin(u / SALTO * Math.PI) * 250);
        if (S.t - S.salto.t >= SALTO + 8) { f.y = GROUND; S.salto = null; S.esconde = false; }
      }
      if (S.t >= S.dur) { f.y = GROUND; this.sup = null; }
    }
    osoDraw(S, s, f, cam) {
      const R = Math.round, d = f.dir, hd = famHoja(s.desviste), ho = famHoja(s.objeto), B = S.oso;
      const pinta = (im, fo, x, y, alto, a = 1) => { const sw = im.naturalWidth / 4, sh = im.naturalHeight / 2, k = alto / sh, w = sw * k, h = sh * k; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = a; ctx.translate(R(x - cam), R(y)); if (d < 0) ctx.scale(-1, 1); ctx.drawImage(im, (fo % 4) * sw, (fo >> 2) * sh, sw, sh, -w / 2, -h, w, h); ctx.restore(); return w; };
      if (B && !B.suelto) {
        const rota = B.para && famHoja(s.objeto + '_rota'), im = rota || ho;
        if (im) {
          const a = Math.max(0, Math.min(1, (S.dur - S.t) / 12)), w = (s.largo || 420);
          ctx.fillStyle = `rgba(0,0,0,${(0.3 * a).toFixed(2)})`; ctx.beginPath(); ctx.ellipse(R(B.x - cam), GROUND - 2, w * 0.42, 10, 0, 0, 7); ctx.fill();
          pinta(im, rota ? Math.min(7, (S.t - B.u) >> 2) : B.para ? 4 : (B.solo || !B.monta ? 4 : 0) + ((S.t >> 1) % 4), B.x, GROUND, rota ? (s.altoRota || s.alto) : s.alto, a);
        }
      }
      if (!hd || !ho || !S.esconde) return; // sin hojas, el luchador se pinta como siempre
      if (!B) pinta(hd, Math.min(3, (S.t / 5) | 0), f.x, GROUND, s.altoDesv || 400); // se arranca la ropa (luego ya va en el oso)
      else if (!B.monta && !S.salto) { // agachado esperando al oso; cuando lo tiene a media cabalgada, salta y cae sobre su lomo (Gastón, 12-nov: desaparecía)
        const L = s.largo || 420, dist = (S.x0 - B.x) * d, p = dist < L * 0.6 ? Math.min(1, 1 - dist / (L * 0.6)) : 0;
        pinta(hd, 3, S.x0, GROUND - Math.round(Math.sin(p * Math.PI * 0.5) * (s.alto || 420) * 0.42), s.altoDesv || 400);
      }
      else if (S.salto) { const u = S.t - S.salto.t; pinta(hd, 4 + Math.min(3, (u / 8) | 0), f.x, f.y, s.altoDesv || 400); }
    }
    // el oso, tras estamparse (Gastón, 12-nov): se cae de culo hacia atrás, aturdido, sacude la cabeza, se levanta y se va
    // hoja <objeto>_aturdido (4x2): 1 se tambalea, 2 cae de culo, 3-5 sentado sacudiendo la cabeza, 6 se levanta, 7-8 se va (mirando hacia atrás)
    // sin esa hoja, como antes: la hoja _rota y se desvanece
    osoSuelta(B, d, s) { famHoja(s.objeto + '_aturdido'); B.suelto = true; (this.osos = this.osos || []).push({ x: B.x, d, t: 0, s }); }
    ososStep() {
      if (!this.osos || !this.osos.length) return;
      for (const b of this.osos) {
        b.t++; const at = famHoja(b.s.objeto + '_aturdido'), rota = famHoja(b.s.objeto + '_rota');
        if (!at) { if (b.t > 70) b.fin = true; continue; }
        const u = b.t - (rota ? 16 : 0);
        if (u > 0 && u < 14) b.x -= b.d * 3; // rebota hacia atrás
        if (u === 22) { this.shake = Math.max(this.shake, 8); Sound.play('fall'); }
        if (u > 84) { b.x -= b.d * Math.min(famHoja(b.s.objeto + '_anda') ? 5 : 9, (u - 84) * 0.6); if ((b.x - this.camX - W / 2) * -b.d > W / 2 + 400 || u > 420) b.fin = true; } // con la hoja de caminar, a paso de oso (que no patine) // se va por donde vino
      }
      this.osos = this.osos.filter(b => !b.fin);
    }
    ososDraw(cam) {
      if (!this.osos || !this.osos.length) return; const R = Math.round;
      for (const b of this.osos) {
        const s = b.s, at = famHoja(s.objeto + '_aturdido'), rota = famHoja(s.objeto + '_rota'), ho = famHoja(s.objeto); let im, fo, alto = s.alto, a = 1, filas = 2, baja = 0;
        const u = b.t - (rota ? 16 : 0);
        if (u < 0 || !at) { im = rota || ho; fo = rota ? Math.min(7, at ? b.t >> 1 : b.t >> 2) : 4; alto = rota ? (s.altoRota || s.alto) : s.alto; if (!at) a = Math.max(0, Math.min(1, (70 - b.t) / 12)); }
        else { im = at; alto = s.altoAtur || s.alto; fo = u < 10 ? 0 : u < 22 ? 1 : u < 30 ? 2 : u < 74 ? [3, 2, 4, 2][((u - 30) / 6 | 0) % 4] : u < 84 ? 5 : 6 + ((u >> 3) & 1);
          const an = u >= 92 && famHoja(s.objeto + '_anda'); if (an) { const n = s.andaN || 8; im = an; alto = s.altoAnda || alto; filas = Math.ceil(n / 4); baja = s.andaHunde || 0; fo = ((u - 92) / 3 | 0) % n; b.vuelta = true; } }
        if (!im) continue; const sw = im.naturalWidth / 4, sh = im.naturalHeight / filas, k = alto / sh, w = sw * k, h = sh * k;
        ctx.fillStyle = `rgba(0,0,0,${(0.3 * a).toFixed(2)})`; ctx.beginPath(); ctx.ellipse(R(b.x - cam), GROUND - 2, (s.largo || 420) * 0.42, 10, 0, 0, 7); ctx.fill();
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = a; ctx.translate(R(b.x - cam), GROUND + baja); if ((b.d < 0) !== !!b.vuelta) ctx.scale(-1, 1); b.vuelta = false; ctx.drawImage(im, (fo % 4) * sw, (fo >> 2) * sh, sw, sh, -w / 2, -h, w, h); ctx.restore();
      }
    }
    sismoRocas(S, x, n, v) { S.rocas = S.rocas || []; for (let i = 0; i < n; i++) S.rocas.push({ x: x + rand(-30, 30), y: GROUND - rand(0, 20), vx: rand(-6, 6), vy: -rand(v * 0.5, v), s: rand(6, 16), rot: 0, vr: rand(-0.3, 0.3), c: i % 3 ? '#8a8072' : '#5e554b', st: false }); if (S.rocas.length > 260) S.rocas.splice(0, S.rocas.length - 260); }
    // la grieta (píxeles oscuros en zigzag del puño al último pilar), los cascotes, el polvo (sismo.webp) y los tres pilares (pilar.webp)
    sismoDraw(S, s, cam) {
      if (S.x0 == null || !S.pil || !S.pil.length) return; const R = Math.round, ult = S.pil[S.pil.length - 1], hasta = S.t >= S.pil[0].t ? S.x0 + (ult.x - S.x0) * Math.min(1, (S.t - S.pil[0].t + 6) / (ult.t - S.pil[0].t + 6)) : S.x0;
      const a = Math.min(S.x0, hasta), b = Math.max(S.x0, hasta);
      ctx.fillStyle = 'rgba(20,14,10,0.85)'; for (let x = a; x < b; x += 8) { const y = GROUND + 4 + (((x * 13) >> 4) % 3) * 4; ctx.fillRect(R(x - cam), y, 9, 4); }
      const pil = famHoja(s.pilar || 'pilar'), pol = famHoja(s.objeto || 'sismo');
      const hoja = (im, fr, x, alto, hunde) => { const cw = im.naturalWidth / 4, ch = im.naturalHeight / 2, q = alto / ch; ctx.drawImage(im, (fr % 4) * cw, (fr >> 2) * ch, cw, ch, R(x - cam - cw * q / 2), R(GROUND + hunde - ch * q), R(cw * q), R(ch * q)); };
      ctx.save(); ctx.imageSmoothingEnabled = false;
      for (const p of S.pil) {
        const u = S.t - p.t; if (u < 0 || u > 40) continue; const fr = Math.min(7, Math.floor(u / 5)) , f2 = Math.min(7, Math.floor(u / 4));
        if (pil) hoja(pil, fr, p.x, p.alto, R(p.alto * 0.075)); // pilar.webp: la base queda a un 7,5 % del pie de la casilla (grietas por debajo del suelo; hojas_super.py: hunde 34 de 452)
        else { ctx.fillStyle = '#5e554b'; const h = p.alto * Math.min(1, u / 6) * (u > 26 ? Math.max(0, 1 - (u - 26) / 12) : 1); ctx.beginPath(); ctx.moveTo(R(p.x - cam - 60), GROUND + 4); ctx.lineTo(R(p.x - cam - 12), R(GROUND - h)); ctx.lineTo(R(p.x - cam + 22), R(GROUND - h * 0.82)); ctx.lineTo(R(p.x - cam + 60), GROUND + 4); ctx.fill(); }
        if (pol) hoja(pol, f2, p.x, p.alto * 0.7, 4);
      }
      ctx.restore();
      for (const b of S.rocas || []) { ctx.fillStyle = '#1d1712'; ctx.fillRect(R(b.x - cam - b.s / 2 - 2), R(b.y - b.s / 2 - 2), R(b.s + 4), R(b.s + 4)); ctx.fillStyle = b.c; ctx.fillRect(R(b.x - cam - b.s / 2), R(b.y - b.s / 2), R(b.s), R(b.s)); ctx.fillStyle = '#b3a896'; ctx.fillRect(R(b.x - cam - b.s / 2), R(b.y - b.s / 2), R(b.s / 2), R(b.s / 3)); } // cascotes de adoquín
    }
    // hoja 4x2 del objeto (8 fotogramas). Variado (joyas): cada objeto es una casilla distinta y gira a saltos; si no, el dibujo gira por fotogramas
    lluviaDraw(S, s, cam) {
      const im = famHoja(s.objeto);
      for (const j of S.parts) {
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(j.x - cam), Math.round(j.y));
        if (im) { const cw = im.naturalWidth / 4, ch = im.naturalHeight / 2, q = j.s / Math.max(cw, ch), k = s.variado ? j.k : (j.k + (j.t >> 2)) % 8; if (s.variado) ctx.rotate(Math.round(j.rot / 0.5) * 0.5); ctx.drawImage(im, (k % 4) * cw, (k >> 2) * ch, cw, ch, -cw * q / 2, -ch * q / 2, cw * q, ch * q); }
        else { const c = s.objeto === 'joyas' ? JOYA_COL[j.k % JOYA_COL.length] : S.color, u = 6, P = [[0, -3], [-1, -2], [0, -2], [1, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-1, 0], [0, 0], [1, 0], [0, 1]]; // provisional de píxel mientras carga la hoja
          ctx.rotate(Math.round(j.rot / 0.5) * 0.5);
          ctx.fillStyle = '#1a1020'; for (const [x, y] of P) ctx.fillRect(x * u * 1.5 - u, y * u * 1.5 - u, u * 2.5, u * 2.5);
          ctx.fillStyle = c; for (const [x, y] of P) ctx.fillRect(x * u * 1.5 - u * 0.75, y * u * 1.5 - u * 0.75, u * 2, u * 2);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(-u * 2, -u * 4, u, u); ctx.fillRect(-u, -u * 3, u, u); }
        ctx.restore();
      }
    }
    // caída: fotogramas 1-4 cayendo (en bucle), 5 el golpe, 6-8 clavado en el suelo
    caidaDraw(S, s, cam) {
      if (S.cy == null) return; const im = famHoja(s.objeto), R = Math.round, alto = s.alto || 380, u = S.hit ? S.t - S.hit : -1;
      const fr = u < 0 ? (S.t >> 2) % 4 : u < 6 ? 4 : 5 + Math.min(2, (u - 6) >> 3);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(R(S.cx - cam), GROUND + 2, alto * 0.35 * (u < 0 ? Math.min(1, Math.max(0.2, (S.cy + 420) / (GROUND + 420))) : 1), 12, 0, 0, 7); ctx.fill(); // sombra que crece al acercarse
      if (im) { const cw = im.naturalWidth / 4, ch = im.naturalHeight / 2, q = alto / ch; // sin aplastar por código: el golpe lo cuentan los fotogramas de la hoja
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(R(S.cx - cam), R(S.cy + (s.hunde || 0))); ctx.drawImage(im, (fr % 4) * cw, (fr >> 2) * ch, cw, ch, -cw * q / 2, -ch * q, cw * q, ch * q); ctx.restore(); }
      else { ctx.fillStyle = S.color; ctx.fillRect(R(S.cx - cam - alto * 0.3), R(S.cy - alto), R(alto * 0.6), R(alto)); }
      ctx.fillStyle = '#8a7f70'; for (const b of S.bits || []) ctx.fillRect(R(b.x - cam), R(b.y), R(b.s), R(b.s * 0.6));
    }
    spawnProj(f) {
      const s = f.def.sp1, big = f.id === 'rajoy' ? 120 : 92;
      this.projs.push({ owner: f, x: f.x + f.dir * f.reach('sp1') * 0.8, y: f.y - f.def.height * 0.58, vx: f.dir * s.speed * (f.move && f.move.up ? 0.95 : 1.35), vy: f.move && f.move.up ? -8 : 0, dmg: s.dmg * f.def.power * (f.ex ? 1.15 : 1), rot: 0, spin: s.spin || 0, bob: s.bob, size: big, t: 0 });
      Sound.play('whoosh');
    }
    // sangre de dibujos animados: gotas de píxel que caen y dejan mancha en el suelo (GAME_CONFIG.sangre: false la quita)
    bleed(x, y, dir, n, up) {
      this.blood = this.blood || [];
      for (let i = 0; i < n; i++) this.blood.push({ x, y, vx: up ? dir * 2 + rand(-6, 6) : dir * rand(1, 8) + rand(-1.5, 1.5), vy: up ? rand(-21, -7) : rand(-9, -1), s: rand(0, 1) > 0.8 ? 12 : rand(0, 1) > 0.5 ? 8 : 5, g: GROUND + rand(4, 40), t: 0 });
      if (this.blood.length > 620) this.blood.splice(0, this.blood.length - 620);
    }
    drawBlood(cam) {
      const q = 4, R = v => Math.round(v / q) * q, ver = sangreVer(), ket = SANGRE === 'ketchup';
      if (!ver) { for (const b of this.blood || []) { if (!b.st) { b.vy += 0.6; b.x += b.vx; b.y += b.vy; if (b.y >= b.g) { b.y = b.g; b.st = true; b.t = 0; } } b.t++; } if (this.blood) this.blood = this.blood.filter(b => !b.st || b.t < 500); return; }
      for (const p of this.pools || []) { // charcos que se van extendiendo bajo el rematado
        p.r += (p.max - p.r) * 0.035; const x = R(p.x - cam), r = R(p.r);
        ctx.fillStyle = ket ? '#9e1c10' : '#5e060d'; ctx.fillRect(x - r, GROUND + 16, r * 2, 16); ctx.fillRect(x - R(r * 0.8), GROUND + 10, R(r * 0.8) * 2, 28);
        ctx.fillStyle = ket ? '#e3361f' : '#a30d18'; ctx.fillRect(x - R(r * 0.72), GROUND + 16, R(r * 0.72) * 2, 14);
        ctx.fillStyle = ket ? '#ffb08a' : '#e2525d'; ctx.fillRect(x - R(r * 0.5), GROUND + 18, R(r * 0.4), 4);
      }
      let bi = 0;
      for (const b of this.blood || []) {
        const mos = ket && (bi++ % 4 === 0); // en modo kétchup, una de cada cuatro gotas es mostaza
        if (!b.st) { b.vy += 0.6; b.x += b.vx; b.y += b.vy; if (b.y >= b.g) { b.y = b.g; b.st = true; b.t = 0; } }
        b.t++; ctx.globalAlpha = b.st ? Math.max(0, 1 - b.t / 500) : 1;
        if (!b.st) { ctx.fillStyle = mos ? '#c9930c' : ket ? '#c4260f' : '#8a0a14'; ctx.fillRect(R(b.x - b.vx * 1.6 - cam), R(b.y - b.vy * 1.6), b.s - 2, b.s - 2); ctx.fillRect(R(b.x - b.vx * 0.8 - cam), R(b.y - b.vy * 0.8), b.s, b.s); }
        ctx.fillStyle = mos ? (b.st ? '#d9a514' : '#ffd23a') : ket ? (b.st ? '#c4260f' : '#ff3d1f') : b.st ? '#7d0a12' : '#e01626';
        const w = b.st ? b.s * 2 : b.s, h = b.st ? 4 : b.s; ctx.fillRect(R(b.x - cam), R(b.y), w, h);
      }
      ctx.globalAlpha = 1; if (this.blood) this.blood = this.blood.filter(b => !b.st || b.t < 500);
      for (const d of this.teeth || []) { // dientes que saltan y se quedan en el suelo
        if (!d.st) { d.vy += 0.7; d.x += d.vx; d.y += d.vy; d.r += d.vx * 0.05; if (d.y >= d.g) { d.y = d.g; d.st = true; d.r = 0; } }
        const x = R(d.x - cam), y = R(d.y); ctx.fillStyle = '#2a1a1a'; ctx.fillRect(x - 2, y - 2, 12, 14); ctx.fillStyle = '#fbf6e6'; ctx.fillRect(x, y, 8, 8); ctx.fillStyle = '#d8d0b8'; ctx.fillRect(x + 4, y + 4, 4, 4); ctx.fillStyle = ket ? '#ff3d1f' : '#b0101c'; ctx.fillRect(x, y + 8, 8, 2);
      }
    }
    dientes(x, y, dir, n) { this.teeth = this.teeth || []; for (let i = 0; i < n; i++) this.teeth.push({ x, y, vx: dir * rand(3, 9), vy: rand(-13, -6), r: 0, g: GROUND + rand(6, 34), st: false }); if (this.teeth.length > 40) this.teeth.splice(0, this.teeth.length - 40); }
    sfx(tipo, x, y, opts, solo, follow, stopAfter) {
      if (!window.SF_VFX || this.fx.filter(e => e.type === 'sf').length > 14) return null;
      const o = Object.assign({ seed: 1 + Math.floor(Math.random() * 99999) }, opts);
      if (follow) { const alto = o.centro ? follow.def.height * 0.5 : 0; o.actor = { feet: () => [SF_W, sfY(follow.y - alto)] }; } // el efecto va pegado al luchador (el escudo, centrado en el cuerpo)
      const e = { type: 'sf', tipo, x, y, opts: o, t: 0, life: 1500, solo, follow, stopAfter }; this.fx.push(e); return e;
    }
    spark(x, y, color, n) { this.fx.push({ type: 'spark', x, y, t: 0, life: 16, tint: color && color !== '#fff' ? color : null, n: n || 9 }); }
    boom(x, y, color) { this.fx.push({ type: 'boom', x, y, t: 0, life: 34, tint: color || null }); }
    // aplica un golpe a 'd'. Devuelve true si entró limpio, false si fue bloqueado y null si no pudo golpear
    strike(a, d, dmg, o) {
      if (d.invul > 0 || d.superArmor || ['down', 'dead', 'getup', 'win', 'dizzy', 'fatal'].includes(d.state) || this.phase === 'finish') return null;
      if (d.escudo > 0) { this.spark(o.hx != null ? o.hx : d.x, d.y - d.hh * 0.6, '#9fd8ff', 8); Sound.play('block'); return null; } // con escudo no entra nada
      if (this.news && this.news.id === 'recortes') dmg *= 1.4;
      if (a.rasgo === 'remontada' && a.hp < a.maxHp * 0.3) dmg *= 1.35;
      if (a.cabreo > 0) dmg *= CABREO_DMG;
      if (d.dDef) dmg *= d.dDef;
      if (d.rasgo === 'impasible' && !o.special) { dmg *= 0.85; o = Object.assign({}, o, { kd: false, launch: false }); }
      d.talT = 0;
      const blocked = d.guard && (d.free || d.state === 'blockstun');
      const hx = o.hx != null ? o.hx : (a.x + d.x) / 2, hy = d.y - d.hh * (o.hy || 0.65);
      d.dir = a.x >= d.x ? 1 : -1; if (o.fromX != null) d.dir = o.fromX >= d.x ? 1 : -1;
      if (blocked) {
        d.hp = Math.max(1, d.hp - (o.special ? dmg * 0.18 : 0)); d.set('blockstun'); d.stunT = 10; d.vx = -d.dir * (o.push || 6) * 0.8;
        this.spark(hx, hy, '#9fd8ff', 6); Sound.play('block'); this.stop = 3; d.meter = Math.min(100, d.meter + 3);
        if (a.set && d.rasgo === 'contragolpe' && Math.abs(a.x - d.x) < 280 && Math.random() < 0.3) { a.set('hit'); a.stunT = 28; a.vx = -a.dir * 7; a.flash = 4; this.spark(a.x, a.y - a.hh * 0.6, '#ffe14a', 10); Sound.play('heavy'); this.callout(d, '¡NO ME CONSTA!'); }
        else if (a.set && d.rasgo === 'maletero' && Math.random() < 0.25) { const nx = clamp(a.x + Math.sign(a.x - d.x || 1) * 170, 150, STAGE_W - 150); this.fx.push({ type: 'maletero', x0: d.x, x1: nx, h: d.def.height, t: 0, life: 66 }); d.x = nx; d.dir = a.x >= d.x ? 1 : -1; d.set('idle'); d.maletT = 40; d.invul = 52; Sound.play('whoosh'); this.callout(d, '¡AL MALETERO!'); } // bomba de humo: se esfuma y reaparece a la espalda del rival entre humo
        return false;
      }
      // combo: cada golpe encadenado cuenta y hace un 10 % menos (mínimo 40 %); en el aire, como mucho 3 golpes
      const chained = d.state === 'hit' || d.state === 'fall';
      if (d.state === 'fall' && ++d.juggle > 3) return null;
      const n = chained ? d.comboN + 1 : 1; dmg *= Math.max(0.4, 1 - 0.1 * (n - 1));
      d.hp = Math.max(0, d.hp - dmg); d.flash = 4;
      if (d.hp <= 0 && (d.rasgo === 'resistencia' || d.dRes) && !d.resUsada) { d.hp = 1; d.resUsada = true; this.callout(d, '¡MANUAL DE RESISTENCIA!'); this.flashT = 4; Sound.play('heal'); }
      if (a.maxHp) {
        if (a.rasgo === 'recaudador' && d.meter > 0) { const r = Math.min(d.meter, 7); d.meter -= r; a.meter = Math.min(100, a.meter + r); }
        if ((a.rasgo === 'chupoptero' || a.dVamp) && a.hp > 0) { a.hp = Math.min(a.maxHp, a.hp + dmg * (a.rasgo === 'chupoptero' ? 0.3 : 0) + dmg * (a.dVamp || 0)); a.lag = Math.max(a.lag, a.hp); }
        if (a.rasgo === 'bulo' && d.hp > 0 && Math.random() < 0.25) { d.bulo = 150; this.callout(d, '¡BULO!'); }
      }
      if (d.rasgo === 'sobres' && Math.random() < 0.55) { this.sobres = this.sobres || []; this.sobres.push({ x: d.x, y: d.y - d.hh * 0.8, vy: -6, vx: -d.dir * (2 + Math.random() * 4), t: 0, s: Math.random() * 6 }); } d.meter = Math.min(100, d.meter + dmg * 0.45); if (!(this.sup && this.sup.f === a)) a.meter = Math.min(100, a.meter + dmg * 0.7);
      const ko = d.hp <= 0;
      const jg = d.juggle;
      if (ko || o.kd || !d.grounded) { d.set('fall'); d.vy = o.launch ? -21 : ko ? -15 : -12; d.y -= 1; d.vx = -d.dir * (o.launch ? 2.5 : ko ? 9 : 6.5); }
      else { d.set('hit'); d.hitPose = o.gut && d.m.hit2 ? 'hit2' : 'hit'; d.stunT = o.stun || 16; d.vx = -d.dir * (o.push || 6); }
      this.spark(hx, hy, o.color, dmg > 11 ? 14 : 9); Sound.play(dmg > 11 ? 'heavy' : (o.sfx || 'hit'));
      const ang = -d.dir > 0 ? -0.35 : Math.PI + 0.35;
      if (dmg > 8 || ko) this.sfx('impact', hx, hy, { angle: ang, size: ko ? 1.6 : 1.1 });
      if (CFG.sangre !== false && (dmg > 11 || ko)) this.sfx('blood', hx, hy, { angle: ang, amount: ko ? 2.2 : 1, size: ko ? 1.4 : 1 }, 'sangre');
      if (CFG.sangre !== false) { this.bleed(hx, hy, d.dir * -1, ko ? 34 : dmg > 11 ? 16 : 7, ko); if (ko || dmg > 12) this.dientes(hx, hy, -d.dir, ko ? 3 : 1); }
      d.comboN = n; d.juggle = jg; if (n >= 2 && !(this.sup && this.sup.f === a)) this.combo = { n, left: a === this.f[0], t: 0 };
      this.stop = dmg > 11 ? 9 : 6; this.shake = Math.max(this.shake, dmg > 11 ? 12 : 5);
      if (dmg > 11 || o.kd) this.fx.push({ type: 'burst', x: hx, y: hy, t: 0, life: 11, rot: Math.random() }); // líneas de impacto en los golpes fuertes
      return true;
    }
    update() {
      let [a, b] = this.f; this.frame = (this.frame || 0) + 1;
      if (this.phase === 'fight' || this.phase === 'finish') this.f.forEach((f, i) => { if (!f.cpu) f.feed(NET.on ? NET.input(i) : readInput(i), this.frame); }); // en el remate también se leen los botones
      if (this.flashT > 0) this.flashT--;
      if (this.combo && ++this.combo.t > 90) this.combo = null;
      if (this.freeze) { if (++this.freeze.t > 74) this.freeze = null; return; }
      if (this.stop > 0) { this.stop--; return; }
      if (this.shake > 0) this.shake--;
      this.bt++; this.pt++;
      this.calls = this.calls.filter(c => ++c.t < 60);
      const slow = this.phase === 'ko' && this.pt < 50 && this.pt % 3;
      if (slow) return;
      const none = { l: 0, r: 0, u: 0, d: 0 };
      if (this.mode === 'lab' && this.phase === 'fight') labAtajos(this);
      const in0 = this.phase === 'fight' ? (a.cpu ? aiInput(a, b, this) : a.buffered()) : none;
      const in1 = this.phase === 'fight' ? (this.mode === 'training' || b.saco ? none : b.cpu ? aiInput(b, a, this) : b.buffered()) : none; // en entrenamiento el rival es un saco de boxeo
      const bul = (f, i) => f.bulo > 0 ? Object.assign({}, i, { l: i.r, r: i.l }) : i; // BULO: izquierda y derecha cambiadas
      a.update(bul(a, in0), b, this); b.update(bul(b, in1), a, this);
      for (const f of this.f) { if (f.bulo > 0) f.bulo--; if (f.rasgo === 'talante' && this.phase === 'fight') { f.talT = (f.talT || 0) + 1; if (f.talT > 150 && f.hp > 0 && f.hp < f.maxHp * 0.7) { f.hp += f.maxHp * 0.0007; f.lag = Math.max(f.lag, f.hp); } } }
      // el aplastado del FALCON EN PICADO solo dura mientras el avión está clavado: si ese súper se corta o lo sustituye otro
      // (p. ej. el aplastado lanza el suyo), se le devuelve la forma; si no, seguía peleando plano y parecía que había desaparecido
      for (const q of this.f) if (q.fat && q.fat.aplastado && !(this.sup && this.sup.squash === q)) q.fat = null;
      if (this.sup) this.updateSuper();
      for (const as of this.assists) as.update(this, as.owner === a ? b : a);
      this.assists = this.assists.filter(as => !as.dead);
      // vida roja (como en Marvel vs Capcom): de cada golpe, la mitad queda como vida recuperable; solo se recupera esa parte, y fuera del combate
      for (let i = 0; i < 2; i++) {
        if (this.tagCd[i] > 0) this.tagCd[i]--;
        const f = this.f[i]; if (f.prevHp != null && f.hp < f.prevHp) { const pr = Math.max(f.rec || 0, f.prevHp); f.rec = f.hp + (pr - f.hp) * 0.5; }
        if (!(f.rec >= f.hp) || f.hp <= 0) f.rec = Math.max(0, f.hp); f.prevHp = f.hp;
        const r = this.res[i]; if (r && r.hp > 0 && r.rec > r.hp) { r.hp = Math.min(r.rec, r.hp + r.maxHp * 0.00017); r.lag = r.hp; r.prevHp = r.hp; }
      }
      // empuje entre cuerpos
      if (!(this.sup && this.sup.vic) && a.grounded && b.grounded && !['down', 'dead'].includes(a.state) && !['down', 'dead'].includes(b.state)) {
        const min = a.hw + b.hw, d = b.x - a.x;
        if (Math.abs(d) < min) { const push = (min - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1); a.x -= push; b.x += push; a.x = clamp(a.x, 60, STAGE_W - 60); b.x = clamp(b.x, 60, STAGE_W - 60); }
      }
      // golpes cuerpo a cuerpo
      for (const [p, q] of [[a, b], [b, a]]) {
        const hb = p.active(); if (!hb) continue; const hu = q.hurt();
        if (hb.x0 < hu.x1 && hb.x1 > hu.x0 && hb.y0 < hu.y1 && hb.y1 > hu.y0) {
          const mv = p.move; p.hitDone = true;
          if (this.strike(p, q, mv.dmg * p.def.power * (p.ex ? 1.15 : 1), { push: mv.push, stun: mv.stun, kd: mv.kd, launch: mv.launch, special: mv.special, sfx: mv.sfx, gut: mv.pose === 'kick' || mv.pose === 'low', hy: (mv.band[0] + Math.min(1, mv.band[1])) / 2 }) !== null) { p.connected = true; }
        }
      }
      // proyectiles
      for (const p of this.projs) {
        p.x += p.vx; p.y += p.vy; p.rot += p.spin; p.t = (p.t || 0) + 1; if (p.bob) p.y += Math.sin(p.t * 0.3) * 2.5;
        const q = p.owner === a ? b : a, hu = q.hurt();
        if (p.x > hu.x0 - 30 && p.x < hu.x1 + 30 && p.y > hu.y0 - 20 && p.y < hu.y1 + 20) {
          if (this.strike(p.owner, q, p.dmg, { special: true, push: 7, stun: 18, fromX: p.x - p.vx, hx: p.x, hy: 0.6 }) !== null) p.dead = true;
        }
        if (p.x < -100 || p.x > STAGE_W + 100 || p.y < -120) p.dead = true;
      }
      for (const p of this.projs) for (const q of this.projs) if (p !== q && p.owner !== q.owner && !p.dead && !q.dead && Math.abs(p.x - q.x) < 50) { p.dead = q.dead = true; this.spark((p.x + q.x) / 2, p.y, '#fff', 12); Sound.play('block'); }
      this.projs = this.projs.filter(p => !p.dead);
      // objetos lanzados
      for (const p of this.thrown) {
        p.vy += 0.45; p.x += p.vx; p.y += p.vy; p.rot += 0.28 * Math.sign(p.vx);
        const q = p.owner === a ? b : a, hu = q.hurt();
        if (p.x > hu.x0 - 40 && p.x < hu.x1 + 40 && p.y > hu.y0 - 30 && p.y < hu.y1 + 30 && this.strike(p.owner, q, 10 * p.owner.def.power, { special: true, push: 9, stun: 22, fromX: p.x - p.vx, hx: p.x, hy: 0.6, sfx: 'heavy' }) !== null) { p.dead = true; romper(this, p.name, p.x, p.y, p.vx); } // se estrella contra el rival y se hace pedazos
        if (!p.dead && p.y > GROUND - 20) { p.dead = true; romper(this, p.name, p.x, GROUND - 40, p.vx); }
        if (p.x < -100 || p.x > STAGE_W + 100 || p.y < -120) p.dead = true;
      }
      this.thrown = this.thrown.filter(p => !p.dead); restosPaso(this);
      caosUpdate(this);
      this.fx = this.fx.filter(e => ++e.t < e.life); this.ososStep();
      // cámara
      this.camX += (clamp((a.x + b.x) / 2 - W / 2, 0, STAGE_W - W) - this.camX) * 0.15;
      // fases
      if (this.bonus) { bonusPaso(this); if (this.phase !== 'intro') return; } // fase de bonus: sus propias reglas
      if (this.phase === 'intro') { if (this.pt === 75) this.say('¡A pelear!'); if (this.pt > 115) { this.phase = 'fight'; this.banner = ''; } }
      else if (this.phase === 'fight') {
        if (this.mode === 'training') {
          this.time = 99 * 60; a.meter = 100; a.hp = Math.max(a.hp, a.maxHp * 0.5);
          if (b.comboN === 0 && (b.state === 'idle' || b.state === 'blockstun')) { b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.01); b.lag = b.hp; }
          if (b.hp < b.maxHp * 0.08) b.hp = b.maxHp * 0.08; // nunca cae: se puede practicar sin fin
        }
        this.time--;
        // si cae un luchador y le queda el aliado, entra el aliado y sigue el asalto
        // (también si los dos caen a la vez y ambos tienen aliado: antes se quedaban los dos tirados sin que acabara el asalto)
        for (let i = 0; i < 2; i++) { const f = this.f[i], r = this.res[i], q = this.cola && this.cola[i]; if (q && q.length && f.hp <= 0 && f.state === 'dead' && f.t > 40 && !(r && r.hp > 0) && this.f[1 - i].hp > 0) { this.res[i] = new Fighter(q.shift(), f.x, f.dir, true, f.level); this.tag(f, true); } }
        for (let i = 0; i < 2; i++) { const f = this.f[i], r = this.res[i], o = this.f[1 - i], ro = this.res[1 - i]; if (f.hp <= 0 && r && r.hp > 0 && f.state === 'dead' && f.t > 40 && (o.hp > 0 || (ro && ro.hp > 0))) this.tag(f, true); }
        const out = (f, i) => f.hp <= 0 && !(this.res[i] && this.res[i].hp > 0) && !(this.cola && this.cola[i] && this.cola[i].length);
        a = this.f[0]; b = this.f[1]; // tras un cambio forzado, los que pelean ahora
        if (out(a, 0) || out(b, 1)) {
          const w = a.hp <= 0 && b.hp <= 0 ? null : (a.hp > 0 ? a : b);
          // si este K.O. decide el combate, el ganador puede rematar: ¡REMÁTALO!
          if (w && w.wins === 1 && w.def.fatal && CFG.remates !== false) { this.phase = 'finish'; this.pt = 0; this.winner = w; this.fin = { w, l: w === a ? b : a, t: 0, on: false }; this.projs = []; Sound.play('ko'); }
          else this.endRound(w, w ? 'K.O.' : 'Doble K.O.');
        }
        else if (this.time <= 0) { const tm = (f, i) => { const r = this.res[i]; return (f.hp + (r ? r.hp : 0)) / (f.maxHp + (r ? r.maxHp : 0)); }, ra = tm(a, 0), rb = tm(b, 1); this.endRound(ra === rb ? null : (ra > rb ? a : b), 'Tiempo'); }
      } else if (this.phase === 'finish') this.finish();
      else if (this.phase === 'ko') {
        const w = this.winner;
        if (this.pt >= 95 && w && w.grounded && w.state !== 'win' && !this.sup && (w.free || this.pt > 200)) { w.set('win'); if (w.hp >= w.maxHp) this.say('¡Mayoría absoluta!'); }
        if (this.pt > 250) {
          if (w && w.wins >= 2) this.done = true; else { this.round++; this.draws = (this.draws || 0) + (w ? 0 : 1); this.startRound(); }
        }
      }
    }
    // ---- remate final (INCONSTITUCIONALITY): el perdedor queda mareado unos segundos; con el botón de SÚPER el ganador lo ejecuta.
    // Coreografía: carrera, cuatro golpes con parada de impacto, golpe final a cámara lenta y el castigo propio de cada personaje.
    finish() {
      const F = this.fin, w = F.w, l = F.l;
      if (!F.on) {
        F.t++;
        if ((l.state === 'down' || l.state === 'dead') && l.t > 28) { l.set('dizzy'); l.y = GROUND; l.dir = w.x >= l.x ? 1 : -1; this.say('¡Remátalo!'); F.t = 0; F.ready = true; w.buf = {}; } // sin restos de botones del combate: decide lo que pulses ahora
        if (F.ready) {
          const inp = w.cpu ? { super: F.t > 50 && Math.random() < 0.05 } : w.buffered();
          if ((inp.super || inp.sp2 || inp.sp1) && w.grounded) {
            Object.assign(F, { on: true, t: 0, objs: [], hold: 0, slow: 0, zoom: 1, dark: 0, splat: [] }); this.banner = ''; this.pools = []; this.remate = true; // remate: para las estadísticas
            F.kind = (w.cpu ? Math.random() < 0.3 : !inp.super) ? 'indulto' : 'fatal'; // SÚPER: INCONSTITUCIONALITY; ESPECIALES: INDULTALITY
            const GG = GUION(w.id), gk = F.kind === 'fatal' ? 'fatal' : 'indulto', gh = gk === 'fatal' ? 'z' : 'y';
            F.G = GG && GG[gk] && w.m['o' + gh + '1'] && w.m['g' + gh + '1'] ? GG[gk] : null; F.hoja = gh; F.P = []; // remate propio con sus dibujos
            w.dir = l.x >= w.x ? 1 : -1; l.dir = -w.dir; w.set('fatal'); w.fpose = 'walk'; l.fpose = 'hit'; Sound.play('super'); this.flashT = 6;
            l.fat = { s: 1, sy: 1, rot: 0, a: 1, dy: 0, dx: 0, kx: 0, vy: 0, vx: 0, vr: 0 };
          }
          else if (F.t > 210) { l.set('fall'); l.vy = -6; l.y -= 1; this.fin = null; this.phase = 'fight'; this.endRound(w, 'K.O.'); }
        }
        return;
      }
      if (F.kind === 'indulto') return F.G ? this.guionIndultoStep(F) : w.def.fatal.kombo && w.m.u8 ? this.komboIndultoStep(F) : this.indultoStep(F);
      if (F.hold > 0) { F.hold--; return; }                       // parada de impacto
      if (F.slow > 0) { F.slow--; if (F.slow % 3) return; }        // cámara lenta
      F.t++;
      if (F.t === 1) F.modo = !F.G && w.def.fatal.oso && famHoja(w.def.super.objeto) ? 'oso' : !F.G && w.def.fatal.espalda && w.m.k7 && w.hp >= w.maxHp * 0.6 ? 'espalda' : ''; // Putin: el oso; Abascal con mucha vida: le parte la espalda (Gastón, 12-nov)
      if (F.t === 1 && F.modo) F.nombre = F.modo === 'oso' ? 'A LOMOS DEL OSO' : 'A LA RODILLA';
      if (F.modo === 'oso') return this.osoFatalStep(F);
      if (F.modo === 'espalda') return this.espaldaFatalStep(F);
      if (w.def.fatal.kombo && w.m.q8 && !F.G) return this.komboFatalStep(F);
      // sin desmembrar (juegan menores): el tajo que parte en dos pasa a la radiografía de golpes; el que revienta, a salir volando
      const kind = { trocea: 'rayosx', revienta: 'vuela' }[w.def.fatal.type] || w.def.fatal.type, L = l.fat, T = F.t, PRE = 62, t = T - PRE, hh = l.def.height, blood = CFG.sangre !== false;
      const P = (f, ...ps) => ps.find(p => f.ok(p)) || 'idle', lx = () => l.x + L.dx, ly = () => l.y + L.dy;
      const gore = (n, up) => { if (!blood) return; this.bleed(lx(), ly() - hh * 0.6, w.dir, n, up); this.bleed(lx(), ly() - hh * 0.45, -w.dir, n >> 1, up); if (n >= 20) this.splat(F, n >= 30 ? 3 : 1); };
      const pool = (x, max) => { if (blood) this.pools.push({ x, r: 8, max }); };
      const END = F.G ? (F.G.dura || 170) : { lluvia: 200, aplasta: 160, jaula: 140, vuela: 105, trocea: 150, revienta: 150, rayosx: 185 }[kind] || 150; F.end = END;
      F.dark = Math.min(1, T / 14); F.zoom += ((T < PRE + 16 ? 1.16 : 1) - F.zoom) * 0.1;
      L.kx *= 0.78; if (!F.air && kind !== 'vuela' || t < 0) L.rot *= 0.8;
      if (T <= PRE) {
        w.x += (lx() - w.dir * Math.max(118, (w.hw || 40) + (l.hw || 40) + 10) - w.x) * 0.3; w.fpose = T < 11 ? 'walk' : 'idle'; /* a su distancia real: si no, un luchador ancho (la silla) empuja al rival fuera de pantalla */
        const HITS = [[14, 'punch', 0.72, 10], [24, 'low', 0.3, 10], [34, 'kick', 0.6, 14], [46, 'punch', 0.75, 18]];
        HITS.forEach(([ht, p, hy, n], i) => {
          if (T >= ht - 2 && T < ht + 8) w.fpose = P(w, p, 'punch');
          if (T === ht) { F.hold = 5; this.shake = 12; this.flashT = 3; Sound.play(i === 3 ? 'heavy' : 'hit'); this.spark(lx() - w.dir * 24, l.y - hh * hy, '#ff6a5a', 8); gore(n); L.kx = w.dir * 30; L.dx += w.dir * 12; L.rot = w.dir * 0.16; l.fpose = P(l, i % 2 ? 'hit2' : 'hit', 'hit'); }
        });
        if (T >= 52) { w.fpose = 'crouch'; if (T === 52) { F.slow = 24; Sound.play('whoosh'); } }
        if (T < PRE) return;
        // golpe final
        this.shake = 26; this.flashT = 8; F.hold = 12; Sound.play('nova'); this.boom(lx(), l.y - hh * 0.5, '#ff3b30'); this.spark(lx(), l.y - hh * 0.6, null, 16); gore(34, true); pool(lx(), 130);
        if (F.G) { w.fpose = 'gz1'; l.fpose = P(l, 'hit2', 'hit'); L.kx = w.dir * 30; return; } // remate propio: lo demás lo cuenta su guion
        if (kind === 'lluvia' || kind === 'aplasta') { w.fpose = P(w, 'jumpup', 'punch'); F.air = true; L.vy = -24; L.vx = w.dir * 4; L.vr = w.dir * 0.24; l.fpose = P(l, 'fall', 'hit'); }
        else if (kind === 'jaula') { w.fpose = P(w, 'punch'); L.kx = w.dir * 46; l.fpose = P(l, 'hit2', 'hit'); }
        else if (kind === 'trocea' || kind === 'revienta' || kind === 'rayosx') { w.fpose = P(w, 'punch'); l.fpose = P(l, 'hit', 'idle'); L.kx = w.dir * 18; F.cv = this.recorte(l, l.fpose); }
        else { w.fpose = P(w, 'kick'); F.hitT = 0; l.fpose = P(l, 'fall', 'hit'); }
        return;
      }
      if (F.G) return this.guionFatalStep(F, t, gore, pool);
      // la animación propia del remate (hoja m): 8 fotogramas del ganador con su objeto y su gesto; se queda en el último
      const mf = F.mf || (F.mf = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'].filter(p => w.ok(p)));
      if (mf.length >= 3) { if (t >= 6) w.fpose = mf[Math.min(mf.length - 1, Math.floor((t - 6) / (72 / mf.length)))]; }
      else { if (t === 18) w.fpose = P(w, 'superc', 'super'); if (t === 40) w.fpose = P(w, 'super'); }
      if (F.air) { // el rival sale volando, cae y rebota
        L.vy += 1.4; L.dy += L.vy; L.dx = clamp(lx() + L.vx, this.camX + 110, this.camX + W - 110) - l.x; L.rot += L.vr; if (blood && T % 2 === 0) this.bleed(lx(), ly() - hh * 0.5, -w.dir, 2);
        if (L.dy >= 0 && L.vy > 0) {
          L.dy = 0; this.shake = 16; Sound.play('heavy'); gore(F.bounced ? 10 : 22, true);
          if (!F.bounced) { F.bounced = true; L.vy = -9; L.vr = 0; L.rot = 0; L.vx *= 0.5; l.fpose = 'ko'; pool(lx(), 170); } else { F.air = false; F.landT = t; }
        }
      }
      if (kind === 'lluvia') { // entierra al rival bajo una montaña de sus objetos
        if (t > 52 && t < 168 && t % 2 === 0) F.objs.push({ x: lx() + rand(-120, 120), y: -60, vy: rand(22, 32), rot: rand(0, 6), s: rand(60, 100), land: GROUND - rand(0, Math.min(250, (t - 52) * 2.4)) });
        if (t === 172) { F.objs.push({ x: lx(), y: -300, vy: 26, rot: 0, s: 230, land: GROUND - 250, last: true }); pool(lx(), 300); }
        for (const o of F.objs) if (!o.done) { o.y += o.vy; o.rot += o.last ? 0 : 0.3; if (o.y >= o.land) { o.y = o.land; o.done = true; if (o.last) { this.shake = 24; this.flashT = 6; Sound.play('nova'); gore(36, true); } else { if (Math.random() < 0.3) Sound.play('hit'); this.shake = Math.max(this.shake, 5); if (Math.random() < 0.3) gore(7, true); } } }
        if (t > 80) L.dy = Math.min(50, (t - 80) * 0.5);
      } else if (kind === 'aplasta') { // un objeto gigante cae y lo deja plano
        if (t === 56) F.objs.push({ x: lx(), y: -420, vy: 0, rot: 0, s: 380, land: GROUND - 150, big: true });
        for (const o of F.objs) if (!o.done) { o.vy += 2.4; o.y += o.vy; if (o.y >= o.land) { o.y = o.land; o.done = true; F.hitT = t; this.shake = 30; this.flashT = 9; F.hold = 8; Sound.play('nova'); gore(40, true); if (blood) { this.bleed(lx(), GROUND - 12, 1.6, 34); this.bleed(lx(), GROUND - 12, -1.6, 34); } pool(lx(), 340); this.boom(lx(), GROUND - 60, '#ff3b30'); } }
        if (F.hitT) { const u = t - F.hitT; L.sy = Math.max(0.3, 1 - u * 0.25); F.objs[0].y = Math.min(GROUND - 50, F.objs[0].land + u * 14); if (blood && u < 46 && u % 3 === 0) this.bleed(lx() + rand(-90, 90), GROUND - 14, 0, 4, true); if (u > 62) F.objs[0].a = Math.max(0, 1 - (u - 62) / 20); }
      } else if (kind === 'jaula') { // cae una jaula y se lo llevan a rastras
        if (t === 16) F.cage = { y: -520, vy: 0 };
        if (F.cage && !F.cage.done) { F.cage.vy += 2.4; F.cage.y += F.cage.vy; if (F.cage.y >= 0) { F.cage.y = 0; F.cage.done = true; F.hitT = t; this.shake = 20; this.flashT = 5; F.hold = 6; Sound.play('heavy'); gore(24, true); pool(lx(), 200); l.fpose = P(l, 'hit'); } }
        if (F.hitT && t > F.hitT + 36) { const u = t - F.hitT - 36; L.dx += w.dir * (2 + u * 0.35); F.cage.dx = L.dx; if (blood && u % 2 === 0) this.bleed(lx(), GROUND - 8, -w.dir * 0.3, 2); }
      } else if (kind === 'trocea') { // tajo en diagonal: la mitad de arriba resbala y cae; la de abajo aguanta en pie un momento y se desploma
        const C = F.cv;
        if (t === 1) Sound.play('whoosh');
        if (t === 12 && C) { this.sfx('slash', lx(), ly() - C.h * 0.5, { size: 2.4, facing: w.dir });
          L.a = 0; F.mitad = { up: { dx: 0, dy: 0, rot: 0, vx: w.dir * 2.2, vy: -2 }, lo: { rot: 0 } }; this.shake = 26; this.flashT = 8; F.hold = 12; Sound.play('heavy'); Sound.play('ko'); gore(44, true); pool(lx(), 280); }
        const Mt = F.mitad;
        if (Mt) {
          const u = Mt.up, suelo = C.h * 0.5 - Math.min(C.w, C.h * 0.5) * 0.35;
          if (!u.st && t > 14) { u.vy += 0.9; u.dx += u.vx; u.dy += u.vy; u.rot += w.dir * 0.045; if (u.dy >= suelo) { u.dy = suelo; u.st = true; u.rot = w.dir * 1.5; this.shake = 12; Sound.play('fall'); gore(14, true); pool(lx() + u.dx, 200); } }
          if (t > 64 && Math.abs(Mt.lo.rot) < 1.5) { Mt.lo.rot -= w.dir * Math.min(0.14, (t - 64) * 0.012); if (Math.abs(Mt.lo.rot) >= 1.5) { Mt.lo.rot = -w.dir * 1.5; this.shake = 10; Sound.play('fall'); } }
          if (blood && t < 130 && t % 2 === 0) { const r = Mt.lo.rot, cx = lx() + Math.sin(r) * C.h * 0.5, cy = ly() - Math.cos(r) * C.h * 0.5; this.bleed(cx, cy, Math.sin(r) * 3 + rand(-1, 1), t < 60 ? 7 : 3, true); }
        }
      } else if (kind === 'revienta') { // se hincha, tiembla... y revienta en pedazos de píxel
        const C = F.cv;
        if (t < 44) { L.s = 1 + t * 0.006; L.kx = (t % 2 ? 1 : -1) * (2 + t * 0.2); if (t % 6 === 0) Sound.play('hit'); if (blood && t % 4 === 0) this.bleed(lx(), ly() - hh * rand(0.3, 0.8), rand(-1, 1), 3, true); }
        if (t === 44) {
          L.a = 0; this.shake = 36; this.flashT = 10; F.hold = 8; Sound.play('nova'); Sound.play('ko'); this.boom(lx(), ly() - hh * 0.5, '#c3001a'); gore(70, true); pool(lx(), 340); if (blood) this.splat(F, 4);
          F.trozos = [];
          if (C) { const q = 18, d = C.c.getContext('2d').getImageData(0, 0, C.w, C.h).data, left = lx() - C.ax * L.s, top = ly() - C.h * L.s;
            for (let y = 0; y + q <= C.h; y += q) for (let x = 0; x + q <= C.w; x += q) { let n = 0; for (let yy = y; yy < y + q; yy += 3) for (let xx = x; xx < x + q; xx += 3) if (d[(yy * C.w + xx) * 4 + 3] > 120) n++; if (n < 12) continue;
              F.trozos.push({ sx: x, sy: y, x: left + x * L.s, y: top + y * L.s, vx: (x - C.ax) / C.w * 18 + rand(-4, 4), vy: rand(-24, -8) - (1 - y / C.h) * 8, r: 0, vr: rand(-0.35, 0.35), q }); }
          }
        }
        for (const p of F.trozos || []) { if (p.st) continue; p.vy += 1.15; p.x += p.vx; p.y += p.vy; p.r += p.vr;
          if (p.x < this.camX + 12 || p.x > this.camX + W - 30) p.vx *= -0.5;
          if (p.y > GROUND - p.q) { p.y = GROUND - p.q; p.vy *= -0.32; p.vx *= 0.55; p.vr *= 0.5; if (Math.abs(p.vy) < 2) { p.st = true; p.vy = 0; } }
          if (blood && t % 5 === 0 && (p.sx + p.sy) % 90 === 0) this.bleed(p.x, p.y, p.vx * 0.1, 1); }
      } else if (kind === 'rayosx') { // radiografía de Hacienda: tres golpes a cámara lenta y se ve cómo cruje cada hueso
        if (t >= 1 && t < 136) { const i = Math.floor((t - 1) / 45), u = (t - 1) % 45; F.rx = { i, u };
          if (u === 14) { this.shake = 22; this.flashT = 4; F.hold = 6; Sound.play('heavy'); Sound.play('hit'); gore(18, true); L.kx = w.dir * 30; l.fpose = P(l, i % 2 ? 'hit2' : 'hit', 'hit'); } }
        if (t === 136) { F.rx = null; F.air = true; L.vy = -15; L.vx = w.dir * 6; L.vr = w.dir * 0.2; l.fpose = P(l, 'fall', 'hit'); Sound.play('ko'); gore(30, true); pool(lx(), 230); }
      } else { // 'vuela': patadón y a la estratosfera dejando un reguero
        const u = t; L.dx += w.dir * 9; L.dy -= 17 - u * 0.05; L.rot += 0.5; L.s = Math.max(0.05, 1 - u / 60);
        if (blood && u < 44) this.bleed(lx(), ly() - hh * 0.4 * L.s, -w.dir, 3);
        if (u === 62) { F.star = { x: lx(), y: ly(), t: 0 }; L.a = 0; Sound.play('ok'); }
      }
      if (t === END) { Sound.play('ko'); this.shake = 14; if (!(F.mf && F.mf.length >= 3)) w.fpose = P(w, 'win'); }
      if (t > END + 120) { this.phase = 'ko'; this.pt = 96; w.wins++; w.fpose = null; l.fpose = null; w.set('win'); l.state = 'dead'; this.banner = ''; }
    }
    // remate propio al estilo Mortal Kombat (Abascal: VOTO DE CASTIGO): se acerca, lo agarra del cuello de la camisa, lo levanta con una
    // mano por encima de la cabeza (el rival patalea) y lo lanza a la estratosfera. Sin decapitaciones: juegan menores (Gastón, 2026-11-08)
    // INCONSTITUCIONALITY de Putin (Gastón, 12-nov): su súper del oso; el oso se estampa contra el rival mareado, que sale volando a la estratosfera
    osoFatalStep(F) {
      const w = F.w, l = F.l, L = l.fat, T = F.t, d = w.dir, s = w.def.super, blood = CFG.sangre !== false, hh = l.def.height, END = 175;
      const P = (f, ...ps) => ps.find(p => f.ok(p)) || 'idle', lx = () => l.x + L.dx; F.end = END - 62;
      F.dark = Math.min(0.5, T / 20); F.zoom += (1 - F.zoom) * 0.1;
      if (T === 1) { this.callout(w, '¡' + F.nombre + '!'); l.fpose = P(l, 'dizzy', 'hit'); w.fpose = 'idle'; F.S = { t: 0, f: w, type: 'oso', hits: 0, color: s.fx || '#9fd6ff', fatal: true }; }
      const S = F.S;
      if (S && S.t < (S.dur || 124)) { S.t = T; this.osoStep(S, w, l, s, false); if (S.t >= S.dur) { w.y = GROUND; F.S = null; } }
      if (!F.S || !F.S.esconde) w.fpose = T > 60 ? P(w, 'win', 'idle') : 'idle';
      if (S && S.choque === T) { F.vuela = { vx: d * 14, vy: -36 }; l.fpose = P(l, 'fall', 'hit'); F.hold = 6; if (blood) { this.bleed(lx(), l.y - hh * 0.5, d, 26, true); this.splat(F, 3); } this.callout(w, '¡DA SVIDÁNIYA!'); }
      if (F.vuela) { const V = F.vuela; V.vy += 0.5; L.dx += V.vx; L.dy += V.vy; L.rot += d * 0.35; L.s = Math.max(0.05, (L.s || 1) - 0.012);
        if (blood && T % 3 === 0 && L.s > 0.3) this.bleed(lx(), l.y + L.dy - hh * 0.4 * L.s, -d, 2);
        if (!F.star && (L.dy < -900 || L.s <= 0.06)) { F.star = { x: lx(), y: Math.max(40, l.y + L.dy), t: 0 }; L.a = 0; Sound.play('ok'); } }
      if (T === END) { Sound.play('ko'); this.shake = 14; }
      if (T > END + 120) { this.phase = 'ko'; this.pt = 96; w.wins++; w.fpose = null; l.fpose = null; w.y = GROUND; w.set('win'); l.state = 'dead'; this.banner = ''; F.S = null; }
    }
    // INCONSTITUCIONALITY de Abascal si gana con mucha vida (Gastón, 12-nov): su súper, placaje, lo levanta tumbado y le parte la espalda en la rodilla (sin desmembrar)
    espaldaFatalStep(F) {
      const w = F.w, l = F.l, L = l.fat, T = F.t, d = w.dir, blood = CFG.sangre !== false, END = 135;
      const P = (f, ...ps) => ps.find(p => f.ok(p)) || 'idle', ease = x => x * x * (3 - 2 * x); F.end = END - 62;
      const kh = p => (w.m[p] ? w.m[p].h * w.k : w.def.height), koh = (l.m.ko ? l.m.ko.h * l.k : l.def.height * 0.3), alto = kh('k6') - koh * 0.3, rodilla = kh('k7') * 0.42, en = x => { L.dx = x - l.x; };
      F.dark = Math.min(1, T / 14); F.zoom += ((T < 80 ? 1.12 : 1) - F.zoom) * 0.08;
      if (T === 1) { this.callout(w, '¡' + w.def.super.name + '!'); Sound.play('whoosh'); l.fpose = P(l, 'dizzy', 'hit'); }
      if (T <= 22) { w.fpose = 'k2'; w.x += (l.x - d * (w.hw + l.hw + 20) - w.x) * 0.22; }
      else if (T <= 30) { w.fpose = 'k3'; if (T === 23) { this.shake = 16; this.flashT = 3; Sound.play('heavy'); l.fpose = P(l, 'hit2', 'hit'); if (blood) this.bleed(l.x, l.y - l.def.height * 0.6, d, 10); } en(w.x + d * (w.hw + l.hw + 20)); }
      else if (T <= 38) { w.fpose = 'k4'; en(w.x + d * (w.hw + l.hw + 6)); if (T === 38) Sound.play('whoosh'); }
      else if (T <= 54) { const p = ease(Math.min(1, (T - 38) / 14)); w.fpose = T < 46 ? 'k5' : 'k6'; if (T === 41) l.fpose = P(l, 'ko', 'fall'); en(w.x + d * (w.hw + l.hw) * (1 - p)); L.dy = -alto * p; L.rot = 0; }
      else if (T <= 72) { w.fpose = 'k6'; en(w.x); L.dy = -alto + Math.sin(T * 0.5) * 4; this.shake = Math.max(this.shake, 2); if (T === 55) this.callout(w, '¡A LA RODILLA!'); }
      else if (T <= 78) { const p = Math.min(1, (T - 72) / 6); w.fpose = T < 74 ? 'k6' : 'k7'; en(w.x + d * 70 * p); L.dy = -alto + (alto - rodilla) * p * p;
        if (T === 78) { if (goreFuerte()) L.parte = 0.05; this.shake = 32; this.flashT = 4; F.hold = 9; Sound.play('heavy'); Sound.play('ko'); if (blood) { this.bleed(l.x + L.dx, GROUND - rodilla - 20, 0, 34, true); this.bleed(l.x + L.dx, GROUND - rodilla, d, 14); this.splat(F, 3); } } }
      else if (T <= 100) { w.fpose = 'k7'; en(w.x + d * 70); L.dy = -rodilla; if (L.parte) L.parte = Math.min(0.5, 0.05 + (T - 78) * 0.09);
        if (T === 80) { Sound.play('heavy'); this.shake = 20; } if (blood && T % 2 === 0 && T < 98) this.bleed(l.x + L.dx, GROUND - rodilla - koh * 0.5, d * 0.3, 7, true); }
      else { w.fpose = 'k8'; if (!F.cae) F.cae = { vy: 0 }; if (L.dy < 0) { F.cae.vy += 1.6; L.dy = Math.min(0, L.dy + F.cae.vy); if (L.dy === 0) { this.shake = 18; Sound.play('fall'); if (blood) this.pools.push({ x: l.x + L.dx, r: 8, max: 200 }); } } }
      if (T === END) { Sound.play('ko'); this.shake = 14; }
      if (T > END + 120) { this.phase = 'ko'; this.pt = 96; w.wins++; w.fpose = null; l.fpose = null; w.set('win'); l.state = 'dead'; this.banner = ''; }
    }
    komboFatalStep(F) {
      const w = F.w, l = F.l, L = l.fat, T = F.t, d = w.dir, blood = CFG.sangre !== false, hh = l.def.height;
      const P = (f, ...ps) => ps.find(p => f.ok(p)) || 'idle', lx = () => l.x + L.dx, END = 150; F.end = END - 62; // drawFinish cuenta desde F.t = 62
      F.dark = Math.min(1, T / 14); F.zoom += ((T < 70 ? 1.14 : 1) - F.zoom) * 0.08;
      const mano = p => { const m = w.m[p]; if (!m || !m.mano) return { x: w.x + d * 60, y: w.y - w.def.height * 1.05 }; return { x: w.x + d * w.k * (m.mano[0] - m.ax), y: w.y + w.k * (m.mano[1] - m.h) }; };
      if (T === 1) { this.callout(w, '¡' + w.def.fatal.name + '!'); Sound.play('whoosh'); l.fpose = P(l, 'hit', 'idle'); }
      if (T <= 24) { w.fpose = 'q1'; w.x += (lx() - d * (w.hw + l.hw + 40) - w.x) * 0.16; }
      else if (T <= 36) { w.fpose = 'q2'; if (T === 30) { l.fpose = P(l, 'hit2', 'hit'); this.shake = 10; Sound.play('hit'); L.kx = d * 14; } }
      else if (T < 56) { w.fpose = 'q3'; L.kx = (T % 2 ? 1 : -1) * 6 - d * 8; if (T % 8 === 0) Sound.play('hit'); }
      if (T === 56) { w.fpose = 'q4'; this.shake = 24; this.flashT = 6; Sound.play('heavy'); l.fpose = P(l, 'hit2', 'hit'); L.kx = 0; F.alza = true; }
      if (T > 56) {
        w.fpose = T < 74 ? 'q4' : T < 94 ? 'q5' : T < 124 ? 'q6' : T < 136 ? 'q7' : 'q8';
        if (F.alza) { // colgado del puño por el cuello de la camisa, pataleando
          const m = mano(T < 124 ? w.fpose : 'q6'), ph = (l.m[l.fpose] ? l.m[l.fpose].h : 400) * l.k, sube = Math.min(1, (T - 56) / 8);
          L.dx += ((m.x - l.x) - L.dx) * (0.3 + sube * 0.5); L.dy += ((m.y + ph * 0.5 * sube + ph * 0.42 * (1 - sube) - l.y) - L.dy) * (0.3 + sube * 0.5); // en alto, cogido por el cinturón: se le ve entero por encima de la cabeza
          L.rot = Math.sin(T * 0.5) * 0.08; if (T % 8 === 0) l.fpose = l.fpose === 'hit' ? P(l, 'hit2', 'hit') : 'hit'; // de pie y colgando: alterna sus dos dibujos de golpeado
          if (T === 128) { F.alza = false; l.fpose = P(l, 'fall', 'hit'); F.vuela = { vx: d * 15, vy: -30 }; Sound.play('whoosh'); this.callout(w, '¡A LA CALLE!'); }
        }
        if (F.vuela) { const V = F.vuela; V.vy += 0.5; L.dx += V.vx; L.dy += V.vy; L.rot += d * 0.35; L.s = Math.max(0.05, (L.s || 1) - 0.012);
          if (blood && T % 3 === 0 && L.s > 0.3) this.bleed(lx(), l.y + L.dy - hh * 0.4 * L.s, -d, 2);
          if (!F.star && (L.dy < -900 || L.s <= 0.06)) { F.star = { x: lx(), y: Math.max(40, l.y + L.dy), t: 0 }; L.a = 0; Sound.play('ok'); } }
      }
      if (T === END) { Sound.play('ko'); this.shake = 14; }
      if (T > END + 120) { this.phase = 'ko'; this.pt = 96; w.wins++; w.fpose = null; l.fpose = null; w.set('win'); l.state = 'dead'; this.banner = ''; }
    }
    // INDULTALITY propia (Abascal: ¡TE ECHO UNA MANO!): palmas, pasodoble y reverencia; le tiende la mano al indultado... y se la arranca
    // (kit de desmembrar del rival: d7 sin brazo, d8 el brazo). Sin FATALITY +18, o sin kit, le hace una llave y lo tira al suelo
    komboIndultoStep(F) {
      const w = F.w, l = F.l, L = l.fat, T = ++F.t, d = w.dir, blood = CFG.sangre !== false, P = (f, ...ps) => ps.find(p => f.ok(p)) || 'idle';
      const mano = p => { const m = w.m[p]; if (!m || !m.mano) return { x: w.x + d * 30, y: w.y - w.def.height * 0.75 }; return { x: w.x + d * w.k * (m.mano[0] - m.ax), y: w.y + w.k * (m.mano[1] - m.h) }; };
      F.dark = Math.min(0.3, T / 30); F.conf = F.conf || [];
      if (T === 1) { this.banner = ''; this.callout(w, '¡TE ECHO UNA MANO!'); Sound.play('special'); l.fpose = P(l, 'idle'); F.frase = 'INDULTADO... Y VOLTEADO'; }
      const fr = T <= 20 ? 'u1' : T <= 40 ? 'u2' : T <= 64 ? 'u3' : T <= 80 ? 'u4' : T <= 100 ? 'u5' : T <= 112 ? 'u6' : T <= 126 ? 'u7' : 'u8'; w.fpose = fr;
      if (T <= 20) w.x += (l.x - d * (w.hw + l.hw + 30) - w.x) * 0.15;
      if (T > 20 && T <= 40 && T % 10 === 1) Sound.play('blip');
      if (T === 30) { l.fpose = P(l, 'win', 'win2'); }
      if (T > 30 && T < 80) { L.dy = -Math.abs(Math.sin((T - 30) * 0.25)) * 18; if (T % 2 === 0) for (let i = 0; i < 2; i++) F.conf.push({ x: l.x + rand(-420, 420), y: -20 - rand(0, 80), vx: rand(-1.2, 1.2), vy: rand(3, 6), r: rand(0, 6), c: ['#ffe14a', '#e30613', '#fff', '#3ddc6a'][Math.floor(rand(0, 4))] }); }
      if (T === 52 || T === 60) { this.shake = 6; Sound.play('block'); } // taconeo
      if (T === 80) { L.dy = 0; l.fpose = P(l, 'idle'); }
      if (T > 100 && T <= 112) { L.kx = (T % 2 ? 1 : -1) * 3; }
      if (T === 113) {
        this.shake = 30; this.flashT = 8; Sound.play('heavy'); Sound.play('ko'); L.kx = 0;
        if (goreFuerte() && l.m.d7 && l.m.d8) {
          l.fpose = 'd7'; F.kit = { img: 'd8', esc: 1, grip: [0.1, 0.5], x: 0, y: 0, rot: -Math.PI / 2, pegada: true }; // lo coge por el muñón (izquierda del dibujo) y lo enseña como un trofeo, con la mano hacia arriba
          if (blood) { this.bleed(l.x - d * 20, l.y - l.def.height * 0.75, -d, 40, true); this.splat(F, 2); this.pools = this.pools || []; this.pools.push({ x: l.x, r: 8, max: 220 }); }
        } else { F.llave = { vx: -d * 9, vy: -20 }; l.fpose = P(l, 'fall', 'hit'); if (blood) this.bleed(l.x, l.y - l.def.height * 0.6, d, 12, true); }
      }
      if (F.kit) { const m = mano(fr === 'u8' ? 'u8' : '-'); /* en u7 lo más alto es la cabeza, no el puño: se usa el punto del hombro */ F.kit.x = m.x; F.kit.y = m.y; F.kit.rot = -Math.PI / 2 + d * 0.55 + Math.sin(T * 0.18) * 0.18 + (fr === 'u7' ? d * 0.6 : 0);
        if (blood && T % 3 === 0 && T < 200) { this.bleed(l.x + L.dx - d * 20, l.y + L.dy - l.def.height * 0.75 * Math.cos(L.rot), -d * 0.5, T < 150 ? 6 : 2, true); this.bleed(m.x, m.y, 0, 2, false); }
        if (T > 140 && T < 170) { L.rot = Math.max(-1.5, Math.min(1.5, L.rot + d * 0.055)); L.dy = (l.m.d7.h * l.k / 2) * Math.sin(Math.abs(L.rot)) * 0.92; } // se desploma hacia atrás (gira por el centro: se baja para que acabe en el suelo)
        if (T === 170) { this.shake = 16; Sound.play('fall'); if (blood) this.bleed(l.x + d * 120, GROUND - 20, 0, 30, true); } }
      if (F.llave) { const V = F.llave; if (!V.st) { V.vy += 1.4; L.dx += V.vx; L.dy += V.vy; L.rot += -d * 0.22; if (L.dy >= 0 && V.vy > 0) { L.dy = 0; L.rot = 0; V.st = true; l.fpose = 'ko'; this.shake = 16; Sound.play('fall'); } } }
      for (const c of F.conf) { c.x += c.vx; c.y += c.vy; c.r += 0.2; }
      F.conf = F.conf.filter(c => c.y < GROUND);
      if (T > 350) { this.phase = 'ko'; this.pt = 96; w.wins++; w.fpose = null; l.fpose = null; l.fat = null; F.kit = null; w.set('win'); l.state = 'dead'; this.banner = ''; }
    }
    // la cabeza arrancada del kit de desmembrar (d4), cogida por el pelo: el borde de arriba del dibujo va en el puño
    drawColumna(F, cam) {
      const K = F.kit, l = F.l, w = F.w; if (!K) return; const pz = K.img || 'd4', m = l.m[pz], im = IMG[l.id + '/' + pz]; if (!m || !im || !im.complete || !im.naturalWidth) return;
      const g = K.pegada ? (K.grip || [0.5, 0.06]) : [0.5, 0.5], e = l.k * (K.esc || 0.62); // en la hoja la cabeza sale más grande que en el cuerpo
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(K.x - cam, K.y); ctx.rotate(K.rot); ctx.scale((K.grip ? 1 : l.dir) * e, e);
      ctx.drawImage(im, -m.w * g[0], -m.h * g[1], m.w, m.h); ctx.restore();
      if (K.pegada && w.fpose) { // el puño del que lo sujeta se vuelve a pintar encima: así se ve que lo agarra, no un trozo pegado
        ctx.save(); ctx.beginPath(); ctx.arc(K.x - cam, K.y, 26, 0, 7); ctx.clip(); w.drawPose(w.fpose, w.x - cam, w.y, w.dir, 1, 1, null, false); ctx.restore();
      }
    }
    // copia del dibujo actual del perdedor, ya escalado y mirando a su lado, para trocearlo
    recorte(l, pose) {
      let p = pose || 'hit'; if (!l.m[p]) p = 'idle'; if (l.beaten && l.m[p + '_x']) p += '_x';
      const m = l.m[p], im = IMG[l.id + '/' + p]; if (!m || !im || !im.complete || !im.naturalWidth) return null;
      const k = l.k, cw = Math.ceil(m.w * k), ch = Math.ceil(m.h * k), c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false;
      if (l.dir < 0) { g.translate(cw, 0); g.scale(-1, 1); } g.drawImage(im, 0, 0, cw, ch);
      return { c, w: cw, h: ch, ax: l.dir > 0 ? m.ax * k : cw - m.ax * k };
    }
    drawCortes(F, cam) {
      const C = F.cv, l = F.l; if (!C) return;
      const lx = l.x + l.fat.dx - cam, ly = l.y, left = lx - C.ax, top = ly - C.h, a = C.h * 0.4, b = C.h * 0.56, ket = SANGRE === 'ketchup', ver = sangreVer();
      if (F.mitad) {
        const pieza = (poly, px, py, rot, dx, dy) => {
          ctx.save(); ctx.translate(px + dx, py + dy); ctx.rotate(rot); ctx.translate(-px, -py);
          ctx.beginPath(); poly.forEach(([x, y], i) => i ? ctx.lineTo(left + x, top + y) : ctx.moveTo(left + x, top + y)); ctx.closePath(); ctx.clip();
          ctx.drawImage(C.c, Math.round(left), Math.round(top));
          if (ver) { ctx.strokeStyle = ket ? '#c4260f' : '#6e000c'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(left, top + a); ctx.lineTo(left + C.w, top + b); ctx.stroke(); ctx.strokeStyle = ket ? '#ff5a2a' : '#d4202c'; ctx.lineWidth = 6; ctx.stroke(); }
          ctx.restore();
        };
        const lo = F.mitad.lo, up = F.mitad.up;
        pieza([[0, a], [C.w, b], [C.w, C.h], [0, C.h]], lx, ly, lo.rot, 0, 0);
        pieza([[0, 0], [C.w, 0], [C.w, b], [0, a]], lx, top + (a + b) / 2, up.rot, up.dx, up.dy);
      } else if (F.t - 62 > 0 && F.t - 62 < 12 && false && F.w.def.fatal.type === 'trocea') { // el tajo, antes de que se separe
        const u = F.t - 62; ctx.fillStyle = u < 6 ? '#ffffff' : '#ffe14a'; for (let i = 0; i <= 24; i++) { const k = i / 24; ctx.fillRect(Math.round(left - 60 + (C.w + 120) * k), Math.round(top + a - 20 + (b - a + 40) * k), 10, 6); }
      }
      for (const p of F.trozos || []) {
        ctx.save(); ctx.translate(p.x - cam + p.q / 2, p.y + p.q / 2); ctx.rotate(p.r); ctx.drawImage(C.c, p.sx, p.sy, p.q, p.q, -p.q / 2, -p.q / 2, p.q, p.q);
        if (ver) { ctx.fillStyle = ket ? '#e3361f' : '#8a0a14'; ctx.fillRect(-p.q / 2, p.q / 2 - 5, p.q, 5); }
        ctx.restore();
      }
    }
    // la radiografía: un recuadro con el hueso que cruje en cada golpe
    drawRayosX(F) {
      const X = F.rx; if (!X) return;
      const q = 12, far = (F.w.x + F.l.x) / 2 - this.camX > W / 2, bx = far ? 70 : W - 70 - 380, by = 160, bw = 380, bh = 300, z = Math.min(1, X.u / 6);
      ctx.save(); ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(z, z); ctx.translate(-bw / 2, -bh / 2);
      pr(-8, -8, bw + 16, bh + 16, '#000'); pr(0, 0, bw, bh, '#08182e'); for (let y = 0; y < bh; y += 8) pr(0, y, bw, 2, 'rgba(120,170,255,0.08)');
      text('RAYOS X DE HACIENDA', bw / 2, 22, 10, '#9fd8ff', 'center');
      const B = '#dbe8ff', S = '#8fa6cc', cx = bw / 2, cy = bh / 2 + 10, roto = X.u >= 14, sep = roto ? Math.min(14, (X.u - 14) * 2) : 0, sh = X.u >= 14 && X.u < 22 ? (X.u % 2 ? 4 : -4) : 0;
      const bloque = (x, y, w, h, c) => pr(cx + x * q + sh, cy + y * q, w * q, h * q, c);
      if (X.i === 0) { // cráneo
        const CR = ['....######....', '..##########..', '.############.', '##############', '##############', '###..####..###', '##....##....##', '##....##....##', '###..####..###', '######..######', '.#####..#####.', '..##########..', '...#.#.#.#.#..', '...#.#.#.#.#..', '....#######...'];
        CR.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') bloque(x - 7 + (roto && x >= 7 ? sep / q : 0), y - 8, 1, 1, (x + y) % 5 ? B : S); }));
      } else if (X.i === 1) { // costillas
        bloque(-1, -8, 2, 16, B);
        for (let k = 0; k < 5; k++) { const y = -7 + k * 3, L = 7 - Math.abs(k - 1); for (const s of [-1, 1]) { const off = roto && k === 2 && s === 1 ? sep / q : 0; for (let x = 1; x <= L; x++) bloque(s > 0 ? x + off : -x - 1, y + (x === L ? 1 : 0), 1, 1, x % 3 ? B : S); } }
      } else { // fémur
        const o = sep / q; bloque(-11, -2, 3, 4, B); bloque(-9, -1, 9, 2, B); bloque(o, -1, 9, 2, B); bloque(8 + o, -2, 3, 4, B); bloque(-9, -1, 9, 1, S);
      }
      if (roto) { // grieta, astillas y sangre
        for (let k = 0; k < 9; k++) pr(cx + sh - 4 + (k % 2 ? 6 : -6) + sep / 2, cy - 90 + k * 20, 8, 20, '#000');
        for (let k = 0; k < 10; k++) { const a = hash(k * 13.7 + X.i) * 6.28, d = (X.u - 14) * (4 + hash(k) * 6); pr(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 6, 6, k % 3 ? B : (sangreVer() ? '#d4202c' : B)); }
        text(['¡CRÁNEO DEFICITARIO!', '¡COSTILLAS RECORTADAS!', '¡FÉMUR EN QUIEBRA!'][X.i], bw / 2, bh - 22, 13, '#ffe14a', 'center', '#000');
      }
      ctx.restore();
    }
    // manchas de sangre en el «cristal» de la pantalla: un borrón de píxeles y un par de goterones que resbalan
    splat(F, n) {
      for (let i = 0; i < n && F.splat.length < 9; i++) {
        const r = rand(2.5, 5), cells = [];
        for (let k = 0; k < 30; k++) { const a = rand(0, 6.28), d = rand(0, r) * rand(0.3, 1); cells.push([Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d * 0.75), d]); }
        const far = (F.w.x + F.l.x) / 2 - this.camX > W / 2; // en el lado contrario a los luchadores, para no taparlos
        F.splat.push({ x: far ? rand(50, 420) : rand(W - 420, W - 50), y: rand(40, 430), cells, t: 0, drips: Array.from({ length: 1 + Math.floor(rand(0, 3)) }, () => ({ dx: Math.round(rand(-r, r) * 0.7), len: 0, max: rand(50, 200), v: rand(0.7, 2) })) });
      }
    }
    // INDULTALITY: en vez de rematarlo, lo indultas. Cae un BOE gigante, sello de INDULTADO, el rival lo celebra... y tropieza con el BOE
    indultoStep(F) {
      const w = F.w, l = F.l, L = l.fat, T = ++F.t, P = (f, ...ps) => ps.find(p => f.ok(p)) || 'idle';
      F.dark = Math.min(0.3, T / 30); F.conf = F.conf || [];
      if (T === 1) { w.fpose = P(w, 'sp1w', 'win2', 'win'); this.banner = ''; this.callout(w, '¡QUEDA USTED INDULTADO!'); F.boe = { y: -360, vy: 0, done: false, stamp: 0 }; Sound.play('special'); }
      if (T > 8 && !F.boe.done) { F.boe.vy += 1.1; F.boe.y += F.boe.vy; if (F.boe.y >= 70) { F.boe.y = 70; F.boe.done = true; this.shake = 8; Sound.play('block'); } }
      if (T === 60) { F.boe.stamp = 1; this.shake = 16; this.flashT = 5; Sound.play('heavy'); }
      if (T === 72) { l.fpose = P(l, 'win', 'win2'); w.fpose = P(w, 'win2', 'win'); Sound.play('heal'); }
      if (T > 72 && T < 150 && T % 2 === 0) for (let i = 0; i < 3; i++) F.conf.push({ x: l.x + rand(-420, 420), y: -20 - rand(0, 80), vx: rand(-1.2, 1.2), vy: rand(3, 6), r: rand(0, 6), c: ['#ffe14a', '#e30613', '#fff', '#39d0ff', '#3ddc6a'][Math.floor(rand(0, 5))] });
      if (T > 72 && T < 150) L.dy = -Math.abs(Math.sin((T - 72) * 0.25)) * 26; // da saltos de alegría
      // el BOE se suelta y sale girando como una cuchilla: corte de papel gigante, de lado a lado, con chorros de sangre
      const B = F.boe, cy = l.y - l.def.height * 0.5, blood = CFG.sangre !== false;
      if (T === 150) { Object.assign(B, { fly: true, wx: this.camX + W / 2, wy: B.y + 190 * 0.55, rot: 0, sc: 0.55 }); Sound.play('whoosh'); this.callout(w, '¡CORTE DE PAPEL!'); }
      if (B.fly && !B.cut) {
        if (T < 168) { const hx = w.x - w.dir * 40, hy = w.y - w.def.height * 1.05; B.wx += (hx - B.wx) * 0.18; B.wy += (hy - B.wy) * 0.18; B.rot += 0.12 + (T - 150) * 0.02; } // coge impulso sobre Sanxe
        else { B.wx += (l.x - B.wx) * 0.25; B.wy += (cy - B.wy) * 0.25; B.rot += 0.6; }                   // y lo lanza girando
        B.sc = Math.max(0.42, B.sc - 0.01); L.dy = 0;
      }
      if (B.fly && !B.cut && T >= 168 && Math.abs(B.wx - l.x) < 30 && Math.abs(B.wy - cy) < 30) {
        B.cut = T; B.vx = -l.dir * 9; B.vy = -7; F.slash = { x: l.x, y: cy }; l.fpose = P(l, 'hit2', 'hit'); this.shake = 26; this.flashT = 8; Sound.play('heavy'); Sound.play('ko');
        if (blood) { for (const d of [-2, -1.2, -0.5, 0.5, 1.2, 2]) this.bleed(l.x, cy + rand(-40, 40), d, 34, true); this.bleed(l.x, cy - 60, 0, 50, true); this.pools = this.pools || []; this.pools.push({ x: l.x, r: 10, max: 300 }); }
      }
      if (B.cut) {
        const u = T - B.cut; B.wx += B.vx; B.wy += B.vy; B.vy += 0.6; B.rot += 0.35; if (B.wy > GROUND - 60) { B.wy = GROUND - 60; B.vx = 0; B.vy = 0; B.rot = 1.35; B.stuck = true; } if (B.stuck) { B.vx = 0; B.rot = 1.35; } // se clava en el suelo, manchado
        if (blood && u < 70 && u % 3 === 0) this.bleed(l.x + rand(-20, 20), cy + rand(-30, 30), rand(-2, 2), 10, true); // chorros por el corte
        if (u < 22) L.rot = l.dir * Math.sin(u * 0.9) * 0.08; // tiembla
        if (u === 24) { l.fpose = P(l, 'fall', 'hit'); Sound.play('whoosh'); }
        if (u > 24 && u < 40) L.rot = -l.dir * Math.min(1.4, (u - 24) * 0.1);
        if (u === 40) { l.fpose = 'ko'; L.rot = 0; this.shake = 14; Sound.play('fall'); if (blood) this.bleed(l.x, GROUND - 20, 0, 40, true); }
      }
      for (const c of F.conf) { c.x += c.vx; c.y += c.vy; c.r += 0.2; }
      F.conf = F.conf.filter(c => c.y < GROUND);
      if (T > 350) { this.phase = 'ko'; this.pt = 96; w.wins++; w.fpose = null; l.fpose = null; l.fat = null; w.set('win'); l.state = 'dead'; this.banner = ''; }
    }
    drawIndulto(F, cam) {
      const l = F.l, T = F.t, b = F.boe;
      ctx.fillStyle = `rgba(40,25,0,${F.dark || 0})`; ctx.fillRect(-OX, 0, VW, H);
      if (b) { // el BOE: un folio gigante con cabecera, líneas de texto y el sello
        ctx.save(); if (b.fly) { ctx.translate(Math.round(b.wx - cam), Math.round(b.wy)); ctx.rotate(b.rot); ctx.scale(b.sc, b.sc); ctx.translate(-150, -190); } else { ctx.translate(Math.round(W / 2 - 150 * 0.55), Math.round(b.y)); ctx.scale(0.55, 0.55); } /* el BOE arriba y pequeño: que se vea a los luchadores */
        const x = 0, y = 0, R = (a, c, d, e, col) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + c, d, e); };
        R(8, 8, 300, 380, 'rgba(0,0,0,0.35)'); R(0, 0, 300, 380, '#f4ecd2'); R(0, 0, 300, 6, '#d8ccaa'); R(294, 0, 6, 380, '#d8ccaa');
        text('BOE', x + 150, y + 40, 30, '#7a0d0d'); text('BOLETÍN OFICIAL DEL ESTADO', x + 150, y + 72, 8, '#333');
        for (let i = 0; i < 9; i++) R(24, 100 + i * 24, 252 - (i % 3) * 40, 6, '#9a917a');
        if (b.stamp) { ctx.save(); ctx.translate(x + 150, y + 230); ctx.rotate(-0.18); const k = Math.max(1, 2.2 - (T - 60) * 0.12); ctx.scale(k, k); ctx.strokeStyle = '#d0111f'; ctx.lineWidth = 6; ctx.strokeRect(-120, -34, 240, 68); text('INDULTADO', 0, 0, 26, '#d0111f'); ctx.restore(); }
        if (b.cut && sangreVer()) { R(0, 0, 300, 10, '#a3000f'); for (let i = 0; i < 14; i++) R((i * 53) % 290, (i * 97) % 360, 10 + (i % 3) * 8, 8 + (i % 4) * 10, i % 2 ? '#b0001a' : '#7a0010'); for (let i = 0; i < 6; i++) R(20 + i * 46, 10, 6, 30 + (i * 37) % 80, '#a3000f'); } // el filo, manchado de sangre
        ctx.restore();
      }
      if (F.slash && b && b.cut && T - b.cut < 16) { // tajo: línea blanca y roja en diagonal sobre el indultado
        const u = T - b.cut, sx = Math.round(F.slash.x - cam), sy = Math.round(F.slash.y), n = 46;
        for (let i = -n; i <= n; i += 2) { ctx.fillStyle = u < 5 ? '#ffffff' : '#c3001a'; ctx.fillRect(sx + i * 3, sy + i, 6, u < 5 ? 6 : 4); }
      }
      if (F.G) this.piezasDraw(F.P, F.w.id, 'y', cam);
      this.drawColumna(F, cam);
      for (const c of F.conf || []) { ctx.fillStyle = c.c; ctx.fillRect(Math.round(c.x - cam), Math.round(c.y), 8, Math.abs(Math.sin(c.r)) * 10 + 3); }
      if (T > 215) { // las letras caen doradas, como en el otro remate
        const u = T - 215, word = 'INDULTALITY', sz = 64, tw = word.length * sz, n = Math.min(word.length, Math.floor(u / 2) + 1);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 436, W, 128);
        text(word.slice(0, n), W / 2 - tw / 2, 500, sz, '#ffcf33', 'left', '#5a3a00');
        if (u > word.length * 2 + 6) text(F.frase || (F.G && F.G.frase) || 'INDULTADO... PERO RECORTADO', W / 2, 590, 20, '#fff', 'center', '#5a3a00');
      }
    }
    drawFinish(cam) {
      const F = this.fin; if (!F || !F.on) return; if (F.kind === 'indulto') return this.drawIndulto(F, cam); const w = F.w, l = F.l, t = F.t - 62, END = F.end || 150, C = 12;
      this.drawCortes(F, cam); this.drawColumna(F, cam); if (F.S) this.osoDraw(F.S, w.def.super, w, cam);
      if (F.G) this.piezasDraw(F.P, w.id, 'z', cam);
      for (const o of F.objs || []) {
        ctx.globalAlpha = o.a == null ? 1 : o.a; const ci = o.big && IMG[w.id + '/crush'];
        if (ci && ci.complete && ci.naturalWidth) { const k = o.s / Math.max(ci.naturalWidth, ci.naturalHeight); ctx.save(); ctx.translate(o.x - cam, o.y); ctx.scale((w.dir < 0 ? -1 : 1) * k, k); ctx.drawImage(ci, -ci.naturalWidth / 2, -ci.naturalHeight / 2); ctx.restore(); }
        else this.drawProj(w.id, o.x - cam, o.y, o.big ? 0 : o.rot, o.s, w.dir < 0);
        ctx.globalAlpha = 1;
      }
      if (F.cage) { const x = l.x + (F.cage.dx || 0) - cam, y = GROUND - 330 + F.cage.y, cw = 230, ch = 330; ctx.fillStyle = '#2a2d36'; ctx.fillRect(x - cw / 2 - 8, y - 16, cw + 16, 20); ctx.fillRect(x - cw / 2 - 8, y + ch - 12, cw + 16, 16); ctx.fillStyle = '#8b93a5'; for (let i = 0; i <= 8; i++) ctx.fillRect(Math.round(x - cw / 2 + i * cw / 8) - 4, y, 8, ch - 8); ctx.fillStyle = '#c9d0de'; for (let i = 0; i <= 8; i++) ctx.fillRect(Math.round(x - cw / 2 + i * cw / 8) - 4, y, 3, ch - 8); }
      if (F.star) { F.star.t++; const k = Math.sin(Math.min(1, F.star.t / 24) * Math.PI) * 26, x = clamp(F.star.x - cam, 60, W - 60), y = clamp(F.star.y, 60, 300); ctx.fillStyle = '#fff'; ctx.fillRect(x - k, y - 3, k * 2, 6); ctx.fillRect(x - 3, y - k, 6, k * 2); }
      for (const d of sangreVer() ? F.splat || [] : []) {
        d.t++; const grow = d.t * 0.9;
        for (const dr of d.drips) { if (d.t > 8) dr.len = Math.min(dr.max, dr.len + dr.v); ctx.fillStyle = '#8f0b15'; ctx.fillRect(d.x + dr.dx * C, d.y, 8, dr.len); ctx.fillRect(d.x + dr.dx * C - 2, d.y + dr.len - 2, 12, 10); ctx.fillStyle = '#d4202c'; ctx.fillRect(d.x + dr.dx * C + 2, d.y, 2, dr.len); }
        ctx.fillStyle = '#8f0b15'; for (const c of d.cells) if (c[2] <= grow) ctx.fillRect(d.x + c[0] * C, d.y + c[1] * C, C, C);
        ctx.fillStyle = '#c8141f'; for (const c of d.cells) if (c[2] <= grow * 0.6 && c[2] < 2.2) ctx.fillRect(d.x + c[0] * C + 2, d.y + c[1] * C + 2, C - 4, C - 4);
      }
      if (t >= END) {
        // las letras caen de una en una como sellazos y luego chorrean
        const u = t - END, word = 'INCONSTITUCIONALITY', sz = 56, tw = word.length * sz, n = Math.min(word.length, Math.floor(u / 2) + 1), v = Math.max(0, u - word.length * 2);
        ctx.save(); ctx.translate(W / 2 + (u < word.length * 2 ? rand(-3, 3) : 0), 250);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(-W, -64, W * 2, 128);
        for (let k = 0; k < 30; k++) { const hx = -tw / 2 + 14 + ((k * 97) % 100) / 100 * (tw - 28); if (hx > -tw / 2 + n * sz) continue; const len = Math.min(40 + (k * 53) % 110, v * (0.7 + ((k * 31) % 10) / 9)), wd = k % 3 === 0 ? 10 : 6; ctx.fillStyle = '#7d0a12'; ctx.fillRect(Math.round(hx / 4) * 4, 18, wd, len); ctx.fillRect(Math.round(hx / 4) * 4 - 2, 18 + len - 2, wd + 4, 8); }
        text(word.slice(0, n), -tw / 2, 0, sz, '#d0111f', 'left', '#000');
        if (n < word.length) { ctx.globalAlpha = 0.8; text(word[n], -tw / 2 + n * sz - sz * 0.25, -8, sz * 1.5, '#ff5560', 'left', '#000'); ctx.globalAlpha = 1; }
        ctx.fillStyle = 'rgba(255,120,120,0.55)'; for (let k = 0; k < n; k++) ctx.fillRect(-tw / 2 + k * sz + 10, -sz / 2 + 4, sz * 0.35, 5); // brillo húmedo
        ctx.restore(); if (u > word.length * 2 + 6) text((F.G && F.G.nombre) || F.nombre || w.def.fatal.name, W / 2, 392, 20, '#ffe14a', 'center', '#7a0d0d');
      }
      else if (t > 4 && t < 46) text((F.G && F.G.nombre) || F.nombre || w.def.fatal.name, W / 2, 150, 20, '#fff', 'center', '#7a0d0d');
      if (sangreVer()) { const g = ctx.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 760); g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(120,0,0,${0.6 * F.dark})`); ctx.fillStyle = g; ctx.fillRect(-OX - 100, -100, VW + 200, H + 200); }
    }
    endRound(w, msg) { this.phase = 'ko'; this.pt = 0; this.winner = w; if (w) { w.wins++; if (w.hp >= w.maxHp) w.perfectos = (w.perfectos || 0) + 1; } this.say(msg); this.sub = w ? '' : '¡EMPATE! EL ASALTO NO CUENTA'; if (msg === 'K.O.' || msg === 'Doble K.O.') { Sound.play('ko'); this.f.filter(f => f.hp <= 0).forEach(l => this.boom(l.x, l.y - l.def.height * 0.5)); this.flashT = 8; } }
    drawProj(id, x, y, rot, size, flip) {
      const im = IMG[id + '/proj'], m = META[id].proj; if (!m || !im || !im.complete) return; const s = size / Math.max(m.w, m.h);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale((flip ? -1 : 1) * s, s); ctx.drawImage(im, -m.w / 2, -m.h / 2, m.w, m.h); ctx.restore();
    }
    // súper de Mónica: una marabunta de médicos y enfermeras entra corriendo por detrás de ella y atropella al rival
    // (cada grupo que le pasa por encima le quita vida y lo arrastra; el último lo tumba)
    // carga (familia): los vehículos van en fila; el primero arrolla al rival y se empotra con él delante, y los siguientes se estampan
    // por detrás contra el de delante. Cada choque rompe más la chapa (hoja <objeto>_rota, 8 fases) y vuelve a emparedar al rival (Gastón, 12-nov)
    cargaStep(S, f, o, s, can) {
      const d = f.dir, n = s.n || 2, L = s.largo || 400, k = 0.55 / n;
      if (S.t === 1) {
        S.run = []; S.bits = []; S.puffs = []; famHoja(s.objeto + '_rota');
        const x0 = d > 0 ? this.camX - L / 2 - 30 : this.camX + W + L / 2 + 30;
        for (let i = 0; i < n; i++) S.run.push({ x: x0 - d * i * (L + (s.hueco || 260)), v: 30, y: 0, fo: i * 3, hit: false, dmg: 0, para: false });
        if (s.grito) this.callout(f, s.grito); Sound.play('whoosh');
      }
      const frente = r => r.x + d * L / 2, cola = r => r.x - d * L / 2, lider = S.run[0];
      const pega = () => { o.x = clamp(frente(lider) + d * o.hw, 60, STAGE_W - 60); o.vx = 0; };
      const aplasta = fuerza => { // el rival, emparedado contra el morro del primero
        o.dir = f.x >= o.x ? 1 : -1;
        if (!S.locked && o.guard && (o.free || o.state === 'blockstun')) { o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.02); o.set('blockstun'); o.stunT = 30; Sound.play('block'); }
        else {
          S.locked = true; S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * k * fuerza); o.set('hit'); o.hitPose = S.hits % 2 && o.m.hit2 ? 'hit2' : 'hit'; o.stunT = 60; o.flash = 4;
          if (CFG.sangre !== false) { this.bleed(o.x, o.y - o.hh * 0.5, d, 22, true); this.bleed(o.x, o.y - o.hh * 0.3, -d, 10, true); this.sfx('blood', o.x, o.y - o.hh * 0.5, { angle: d > 0 ? -0.35 : Math.PI + 0.35, amount: 1.4, size: 1.2 }, 'sangre'); }
        }
        this.combo = { n: S.hits, left: f === this.f[0], t: 0 };
      };
      const choque = (x, fuerte) => { // cristales y trozos de chapa
        this.shake = Math.max(this.shake, fuerte ? 26 : 18); this.flashT = 4; this.stop = 6; Sound.play('choque'); Sound.play('heavy');
        for (let i = 0; i < (fuerte ? 26 : 16); i++) { const glass = i % 3 > 0; S.bits.push({ x: x + rand(-20, 20), y: GROUND - rand(20, 110), vx: d * rand(-2, 9) + rand(-3, 3), vy: -rand(5, 15), s: glass ? rand(4, 9) : rand(6, 13), glass, c: glass ? (i % 2 ? '#cfefff' : '#ffffff') : (i % 2 ? '#9aa0ab' : '#4a4e5a'), st: false }); }
      };
      let quedan = 0;
      S.run.forEach((r, i) => {
        if (!r.para) {
          r.x += d * r.v; const delante = S.run[i - 1];
          if (delante && delante.para) { // se estampa por detrás contra el de delante, que empuja a los demás y vuelve a aplastar al rival
            if ((frente(r) - cola(delante)) * d >= 0) {
              r.x = cola(delante) - d * L / 2; r.para = true; r.dmg += 3; for (let j = i - 1; j >= 0; j--) { S.run[j].dmg += 2; S.run[j].x += d * 26; }
              choque(cola(delante), true); if (S.pin) { pega(); aplasta(1); }
            }
          } else if (!delante && !r.hit) { // el primero llega al rival
            const rel = (frente(r) - (o.x - d * o.hw)) * d;
            if (rel >= 0 && rel < 90) {
              r.hit = true;
              if (can) { r.para = true; r.dmg += 2; S.pin = true; r.x = o.x - d * (o.hw + L / 2); pega(); aplasta(1.2); choque(frente(r), false); }
              else if ((o.state === 'down' || o.state === 'getup') && o.hp > 0) { S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.05); o.flash = 3; if (CFG.sangre !== false) this.bleed(o.x, GROUND - 20, d, 10, true); } // tumbado: le pasa por encima
            }
          }
        }
        if (!r.para && (r.x - this.camX) * d < W + L) quedan++;
        if (r.para && S.t % 3 === 0 && r.dmg >= 4) S.puffs.push({ x: r.x + rand(-L * 0.3, L * 0.3), y: GROUND - rand(60, 120), vy: -rand(2.5, 4), r: rand(14, 22), age: 0, life: rand(40, 60) });
      });
      if (S.pin && (o.state === 'hit' || o.state === 'blockstun')) pega(); // sigue emparedado hasta el último choque
      for (const b of S.bits) { if (b.st) continue; b.vy += 0.8; b.x += b.vx; b.y += b.vy; if (b.y >= GROUND - 3) { b.y = GROUND - 3; if (Math.abs(b.vy) < 3) b.st = true; b.vy *= -0.3; b.vx *= 0.5; } }
      for (const q of S.puffs) { q.age++; q.y += q.vy; q.r += 0.6; } S.puffs = S.puffs.filter(q => q.age < q.life);
      if (S.pin && !S.fin && S.run.every(r => r.para)) {
        S.fin = true; S.pin = false; this.flashT = 8; this.shake = 26;
        if (can && this.strike(f, o, s.dmg * f.def.power * 0.32, { special: true, kd: true, color: S.color, fromX: lider.x, hx: o.x })) { S.hits++; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; }
      }
      if (S.t >= S.dur || (S.t > 30 && !quedan && !S.run.some(r => r.para))) this.sup = null;
    }
    estampidaStep(S, f, o, s, can) {
      const d = f.dir, n = s.n || 12;
      if (S.t === 1) {
        S.run = []; for (let i = 0; i < n; i++) S.run.push({ x: (d > 0 ? this.camX - 220 : this.camX + W + 220) - d * (i * (s.sep || 92) + rand(0, 50)), v: rand(24, 30), y: rand(-24, 20), fo: Math.floor(rand(0, 8)), hit: false });
        S.run.sort((a, b) => a.y - b.y); const grito = s.grito || (s.familia ? '' : '¡MAREA BLANCA!'); if (grito) this.callout(f, grito); // el grito de Mónica no sale en los súper de otros (familia carga) Sound.play('whoosh');
      }
      let quedan = 0;
      for (const r of S.run) {
        r.x += d * r.v; const rel = (r.x - o.x) * d;
        if ((r.x - this.camX) * d < W + 400) quedan++;
        if (!r.hit && rel > -50 && rel < 70) {
          r.hit = true; if ((o.state === 'down' || o.state === 'getup') && o.hp > 0) { S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.035); o.flash = 3; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; continue; } if (!can) continue;
          const blocked = !S.locked && o.guard && (o.free || o.state === 'blockstun');
          o.dir = f.x >= o.x ? 1 : -1;
          if (blocked) { o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.012); o.set('blockstun'); o.stunT = 8; Sound.play('block'); continue; }
          S.locked = true; S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * (s.k || 0.06));
          o.set('hit'); o.hitPose = S.hits % 2 && o.m.hit2 ? 'hit2' : 'hit'; o.stunT = 16; o.flash = 3; o.x = clamp(o.x + d * 16, 60, STAGE_W - 60);
          this.spark(o.x + rand(-30, 30), o.y - o.hh * rand(0.2, 0.8), '#ffffff', 7); this.shake = Math.max(this.shake, 8); Sound.play(S.hits % 3 ? 'hit' : 'heavy');
          if (CFG.sangre !== false && S.hits % 2) this.bleed(o.x, o.y - o.hh * 0.5, d, 6, true);
          this.combo = { n: S.hits, left: f === this.f[0], t: 0 };
        }
        if (S.t % 5 === 0) S.parts.push({ x: r.x - d * 60, y: GROUND - 6 + r.y * 0.3, t: 0 }); // polvo
      }
      for (const p of S.parts) p.t++; S.parts = S.parts.filter(p => p.t < 18);
      const ultimo = S.run.every(r => r.hit) && !S.fin;
      if (ultimo && can && S.hits) { S.fin = true; this.flashT = 8; this.shake = 22; if (this.strike(f, o, s.dmg * f.def.power * 0.3, { special: true, kd: true, color: S.color, fromX: o.x - d * 80, hx: o.x })) { S.hits++; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; } }
      if (S.t >= S.dur || (S.t > 30 && !quedan)) { this.sup = null; }
    }
    // súper de Sanxe: un Falcon gigante cae en picado sobre el rival y lo estampa contra el suelo (con mucha sangre)
    estampaStep(S, f, o, s, can) {
      // S.nx/S.ny: punta del morro. Baja en diagonal siguiendo el eje del avión hasta clavarse en el suelo justo encima del rival
      const IMP = GROUND - 14, SL = 0.56;
      if (S.t === 1) { S.nd = o.x >= f.x ? 1 : -1; S.nx = o.x; S.ny = -380; S.vy = 7; this.callout(f, '¡FALCON EN PICADO!'); }
      if (!S.hit) {
        S.nx += (o.x - S.nx) * 0.1; S.vy += 1.5; S.ny += S.vy; this.shake = Math.max(this.shake, Math.min(10, S.t / 6));
        if (S.ny >= IMP) {
          S.hit = S.t; S.ny = IMP; this.shake = 36; this.flashT = 10; Sound.play('nova'); Sound.play('heavy'); Sound.play('choque'); this.boom(S.nx, GROUND - 60, '#ff3b30');
          // se estampa de verdad: cristales de las ventanillas y trozos de chapa saltando desde el morro y el fuselaje
          const nd = S.nd; S.bits = [];
          for (let i = 0; i < 52; i++) { const glass = i < 36, back = glass ? rand(0, 230) : rand(0, 50); S.bits.push({ x: S.nx - nd * back, y: IMP - 20 - back * SL - rand(0, 30), vx: rand(-8, 8) + nd * rand(0, 7), vy: -rand(6, 18), s: glass ? rand(4, 10) : rand(6, 14), glass, c: glass ? (i % 3 ? '#cfefff' : '#ffffff') : (i % 2 ? '#c9ced8' : '#54586a'), st: false }); }
          if ((o.state === 'down' || o.state === 'getup') && o.hp > 0 && Math.abs(o.x - S.nx) < 170 + o.hw) { S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.7); o.flash = 4; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; }
          if (can && Math.abs(o.x - S.nx) < 170 + o.hw) {
            if (this.strike(f, o, s.dmg * f.def.power * 1.4, { special: true, kd: true, color: '#ff3b30', fromX: f.x, hx: o.x })) { S.hits++; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; }
            if (CFG.sangre !== false) { for (const d of [-1.8, -0.8, 0.8, 1.8]) this.bleed(o.x, GROUND - 40, d, 30, true); this.bleed(o.x, o.y - o.hh * 0.5, 0, 40, true); this.pools = this.pools || []; this.pools.push({ x: o.x, r: 8, max: 260 }); }
            o.fat = { s: 1, sy: 0.3, rot: 0, a: 1, dy: 0, dx: 0, kx: 0, aplastado: true }; S.squash = o;
          }
        }
      } else {
        const u = S.t - S.hit;
        if (CFG.sangre !== false && S.squash && u < 40 && u % 4 === 0) this.bleed(S.squash.x + rand(-80, 80), GROUND - 14, 0, 5, true);
        if (S.squash && u <= 40) { S.squash.x = S.nx; S.squash.vx = 0; } // el rival se queda aplastado bajo el morro
        if (S.squash && u > 40) { S.squash.fat = null; S.squash = null; }
        // se queda clavado (rebota un poco al clavarse) y al final se hunde echando humo
        S.ny = IMP + (u < 10 ? Math.sin(u / 10 * Math.PI) * -12 : 0) + Math.max(0, u - 52) * 1.4;
        for (const b of S.bits || []) { if (b.st) continue; b.vy += 0.7; b.x += b.vx; b.y += b.vy; if (b.y >= GROUND - 4) { b.y = GROUND - 4; if (Math.abs(b.vy) < 3) b.st = true; b.vy *= -0.3; b.vx *= 0.5; } }
        if (u === 6) Sound.play('choque');
        S.puffs = S.puffs || [];
        if (u % 2 === 0 && u < 85) S.puffs.push({ x: S.nx - S.nd * rand(20, 120), y: GROUND - 60 - rand(0, 40), vx: -S.nd * rand(0.3, 1.4) + rand(-0.4, 0.4), vy: -rand(3.2, 4.6), r: rand(20, 30), age: 0, life: rand(70, 100), pal: u < 40 || Math.random() < 0.5 ? 'negro' : 'gris' });
        for (const q of S.puffs) { q.age++; q.x += q.vx + Math.sin((q.age + q.r) * 0.12) * 0.4; q.y += q.vy; q.vy *= 0.99; q.r += 0.75; }
        S.puffs = S.puffs.filter(q => q.age < q.life);
      }
      if (S.t >= S.dur) { if (S.squash) S.squash.fat = null; this.sup = null; }
    }
    // ---- MOTOR DE GUIONES (DISENO.md, 3 bis) ----
    // Cada súper / INCONSTITUCIONALITY / INDULTALITY propio es una lista de «piezas» (data.js, window.GUIONES): objetos de la hoja
    // del personaje (o<hoja>1-4) que caen, cruzan, brotan, persiguen, rodean, se lanzan o aparecen fijos, con su efecto al golpear.
    // Todo el azar sale de Math.random dentro de update (online: semilla común).
    piezasStep(Q, specs, T, C) {
      const H = C.hh, camX = this.camX;
      (specs || []).forEach((sp, i) => {
        const n = sp.n || 1;
        for (let k = 0; k < n; k++) {
          if (T - 1 !== (sp.desde || 0) + k * (sp.cada || 8)) continue; // el reloj del guion empieza en 1
          const d = C.f.dir, alto = sp.alto || 200, p = { sp, i, t: 0, dir: d, alto, rot: 0, a: 1, grow: 1, fr: (sp.fr || [1])[0] };
          if (sp.mov === 'cae') Object.assign(p, { x: C.tx + (sp.ox || 0) * d + rand(-(sp.dx || 0), sp.dx || 0), y: -40 - rand(0, 80), vy: sp.v || 4 });
          else if (sp.mov === 'cruza') Object.assign(p, { x: d > 0 ? camX - alto : camX + W + alto, y: GROUND - H * (sp.y == null ? 0.3 : sp.y) + alto * 0.5, vx: d * (sp.v || 20) });
          else if (sp.mov === 'persigue') Object.assign(p, { x: (d > 0 ? camX - alto : camX + W + alto) - d * rand(0, 40), y: GROUND + rand(-8, 8), vx: d * (sp.v || 16) * rand(0.9, 1.1) });
          else if (sp.mov === 'brota') Object.assign(p, { x: C.tx + (sp.ox || 0) * d + rand(-(sp.dx || 0), sp.dx || 0), y: GROUND + 6, grow: 0 });
          else if (sp.mov === 'lanza') { const x0 = C.f.x + d * 50, y0 = C.f.y - C.f.def.height * 0.55 + alto * 0.5, Tf = sp.tf || 22, ty = GROUND - H * 0.25 + alto * 0.5, vy = -(sp.v || 12); Object.assign(p, { x: x0, y: y0, vx: (C.tx - x0) / Tf, vy, g: 2 * (ty - y0 - vy * Tf) / (Tf * Tf), Tf }); }
          else if (sp.mov === 'rodea') Object.assign(p, { ang: rand(0, 6.28), x: C.tx, y: GROUND - H * 0.4 });
          else Object.assign(p, { x: C.f.x + d * (sp.dx || 170), y: GROUND }); // 'fijo': delante del que lo lanza
          Q.P.push(p);
        }
      });
      for (const p of Q.P) {
        const sp = p.sp; p.t++;
        const frs = p.hit && sp.golpe ? sp.golpe : (sp.fr || [1]), u = p.hit ? p.t - p.hit : p.t, an = sp.anim || 5;
        p.fr = sp.una || (p.hit && sp.golpe) ? frs[Math.min(frs.length - 1, Math.floor(u / an))] : frs[Math.floor(p.t / an) % frs.length];
        const impacto = () => { if (p.hit) return; p.hit = p.t; C.hit(p, sp); };
        if (sp.mov === 'cae') { if (!p.hit) { p.vy += sp.g || 1.4; p.y += p.vy; if (p.y >= GROUND) { p.y = GROUND; impacto(); } } }
        else if (sp.mov === 'cruza' || sp.mov === 'persigue') { p.x += p.vx; if (sp.mov === 'persigue') p.yb = Math.abs(Math.sin(p.t * 0.5)) * -6; if (!p.hit && Math.abs(p.x - C.tx) < 60) impacto(); if ((p.x - camX) * p.dir > W + p.alto * 1.5) p.dead = true; }
        else if (sp.mov === 'brota') { p.grow = Math.min(1, p.t / 8); if (p.t === 8) impacto(); }
        else if (sp.mov === 'lanza') { if (!p.hit) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += 0.35 * p.dir; if (p.t >= p.Tf) { p.rot = 0; impacto(); } } }
        else if (sp.mov === 'rodea') { p.ang += 0.22; p.x = C.tx + Math.cos(p.ang) * p.alto * 0.8; p.y = GROUND - H * 0.35 + Math.sin(p.ang) * p.alto * 0.35 + p.alto * 0.5; if (p.t % 14 === 7) { p.hit = 0; impacto(); } if (p.t > (sp.dura || 60)) p.dead = true; }
        else { if (sp.golpea && p.t === sp.golpea) impacto(); if (sp.huye && p.hit) { p.x += p.dir * sp.huye * Math.min(1, (p.t - p.hit) / 20); if ((p.x - camX) * p.dir > W + p.alto * 1.5) p.dead = true; } }
        if (p.hit && !sp.huye && sp.mov !== 'cruza' && sp.mov !== 'persigue' && sp.mov !== 'rodea') { const v = p.t - p.hit, dura = sp.dura || 40; if (v > dura - 10) p.a = Math.max(0, (dura - v) / 10); if (v > dura) p.dead = true; }
        if (!p.hit && p.t > 260) p.dead = true;
      }
      Q.P = Q.P.filter(p => !p.dead);
    }
    // efecto al golpear una pieza (explosión, impacto, sangre, rayo, veneno, fuego, polvo)
    guionFx(p, sp) {
      const fx = sp.fx, y = p.y - p.alto * 0.4;
      this.shake = Math.max(this.shake, sp.temblor || 10);
      if (fx === 'explosion') { this.fx.push({ type: 'mboom', x: p.x, y: GROUND - 70, t: 0, life: 300, seed: Math.random() * 1000, size: sp.fxs || 1.4 }); Sound.play('nova'); this.flashT = Math.max(this.flashT, 5); }
      else if (fx === 'rayo') { this.sfx('lightning', p.x, GROUND, { kind: 'strike', top: 0, clouds: false }); Sound.play('nova'); }
      else if (fx === 'veneno') this.sfx('poison', p.x, GROUND, { kind: 'cloud', size: 1 });
      else if (fx === 'fuego') this.sfx('fire', p.x, GROUND, { size: 1.2 });
      else if (fx === 'sangre') { if (CFG.sangre !== false) this.bleed(p.x, y, p.dir, 14, true); Sound.play('heavy'); }
      else if (fx === 'polvo') { this.spark(p.x, GROUND - 10, '#e8dcc0', 10); Sound.play('fall'); }
      else if (fx === 'magia') { this.sfx('energy', p.x, y, { kind: 'orb', size: 1 }); Sound.play('heal'); }
      else { this.sfx('impact', p.x, y, { angle: 0, size: 1.3 }); Sound.play('heavy'); }
    }
    // daño del súper propio: como la estampida (de pie, cubriéndose o en el suelo)
    // súper de agarre (Abascal: LA RECONQUISTA): carga con el hombro, lo agarra, lo levanta por encima de la cabeza y lo parte contra la rodilla.
    // Todo con fotogramas propios (k1..k8) y el rival con los suyos (golpeado y tumbado), colocado sobre las manos con fat
    komboSuelta(S, f, golpe) {
      const o = S.vic; if (!o) return; S.vic = null; o.agarre = null; o.fat = null; o.y = GROUND; o.x = clamp(f.x + f.dir * 120, 60, STAGE_W - 60);
      if (!golpe) { o.set('hit'); o.stunT = 12; return; }
      // lo tira de la rodilla al suelo, tumbado y roto (sin volver a ponerlo de pie para el golpe final)
      S.hits++; this.combo = { n: S.hits, left: f === this.f[0], t: 0 };
      o.hp = Math.max(o.rasgo === 'resistencia' && !o.resUsada ? 1 : 0, o.hp - f.def.super.dmg * f.def.power * 0.3); o.flash = 4; o.dir = -f.dir;
      o.set('fall'); o.y = GROUND - f.def.height * 0.3; o.vy = -5; o.vx = f.dir * 7; o.juggle = 9;
      if (CFG.sangre !== false) { this.bleed(o.x, o.y - 30, f.dir, 24, true); this.dientes(o.x, o.y - 40, f.dir, 2); }
    }
    komboStep(S, f, o, s, can) {
      const u = S.t, d = f.dir, H = f.def.height, K = p => { if (f.m[p]) f.kpose = p; }, sangre = CFG.sangre !== false;
      const golpe = (k, hy) => { S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * k); o.flash = 4; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; this.spark(o.x, o.y - o.hh * hy, '#ffffff', 9); };
      if (u === 1) { S.ph = 'carga'; S.c = 1; this.callout(f, '¡' + s.name + '!'); Sound.play('whoosh'); }
      const v = u - S.c, fase = (ph) => { S.ph = ph; S.c = u; };
      if (S.ph === 'carga') { // embestida: corre agachado hacia el rival
        K('k2'); const gap = (o.x - f.x) * d;
        if (gap > f.hw + o.hw + 30) f.x = clamp(f.x + d * 24, 60, STAGE_W - 60); else fase('choque');
        if (S.ph === 'carga' && v > 26) fase('fallo');
      }
      if (S.ph === 'choque' && u === S.c) {
        K('k3'); const tumbado = o.state === 'down' || o.state === 'getup', blocked = o.guard && (o.free || o.state === 'blockstun');
        if (!can || tumbado) fase('fallo');
        else if (blocked) { o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.03); o.set('blockstun'); o.stunT = 14; o.vx = d * 9; this.spark(o.x - d * 30, o.y - o.hh * 0.6, '#9fd8ff', 8); Sound.play('block'); this.shake = 10; fase('fallo'); }
        else { S.vic = o; S.locked = true; o.set('hit'); o.dir = -d; o.agarre = o.ok('hit2') ? 'hit2' : 'hit'; o.fat = { s: 1, sy: 1, rot: 0, a: 1, dy: 0, dx: 0, kx: 0 }; golpe(0.1, 0.6); this.shake = 16; this.stop = 5; Sound.play('heavy'); }
      }
      if (S.ph === 'fallo') { const v = u - S.c; K(v < 10 ? 'k3' : 'k1'); if (v === 0) { Sound.play('whoosh'); f.meter = Math.min(100, (f.meter || 0) + 35); this.callout(f, '¡CASI!'); } if (v > 12) { this.sup = null; f.set('idle'); } return; } // si falla el placaje no se queda clavado: recupera enseguida y le devuelve algo de súper
      const o2 = S.vic; if (!o2) { if (S.ph === 'fin') K('k8'); if (u >= S.dur || (S.ph === 'fin' && u >= S.c + 16)) this.sup = null; return; }
      o2.vx = 0; o2.vy = 0; o2.y = GROUND; o2.stunT = 999; o2.state = 'hit'; const L = o2.fat;
      const ease = x => x * x * (3 - 2 * x), kh = p => (f.m[p] ? f.m[p].h * f.k : H), koh = (o2.m.ko ? o2.m.ko.h * o2.k : H * 0.3), alto = kh('k6') - koh * 0.3, rodilla = kh('k7') * 0.42; /* en alto: tumbado sobre las manos del sprite k6, no a la altura de su estatura */
      if (S.ph === 'choque') { K('k3'); o2.x = f.x + d * (f.hw + o2.hw + 20); if (v >= 6) fase('agarre'); }
      else if (S.ph === 'agarre') { K('k4'); o2.x = f.x + d * (f.hw + o2.hw + 6); if (v >= 8) { fase('alza'); Sound.play('whoosh'); } }
      else if (S.ph === 'alza') { // lo levanta tumbado por encima de la cabeza
        const p = ease(Math.min(1, v / 14)); K(v < 8 ? 'k5' : 'k6');
        if (v === 3) o2.agarre = o2.ok('ko') ? 'ko' : 'fall';
        o2.x = f.x + d * (f.hw + o2.hw) * (1 - p); L.dy = -alto * p; L.rot = 0;
        if (v >= 16) { fase('arriba'); this.callout(f, '¡A LA RODILLA!'); }
      }
      else if (S.ph === 'arriba') { K('k6'); o2.x = f.x; L.dy = -alto + Math.sin(v * 0.5) * 4; this.shake = Math.max(this.shake, 2); if (v >= 16) fase('baja'); }
      else if (S.ph === 'baja') { // lo deja caer de golpe contra la rodilla
        const p = Math.min(1, v / 6); K(v < 2 ? 'k6' : 'k7'); o2.x = f.x + d * 70 * p; L.dy = -alto + (alto - rodilla) * p * p;
        if (v === 6) {
          golpe(0.32, 0.4); if (goreFuerte()) L.parte = 0.05; this.shake = 32; this.flashT = 3; this.stop = 9; Sound.play('heavy'); Sound.play('ko');
          if (sangre) { this.bleed(o2.x, GROUND - rodilla - 20, 0, 34, true); this.bleed(o2.x, GROUND - rodilla, d, 14, false); }
          fase('rodilla');
        }
      }
      else if (S.ph === 'rodilla') { // la espalda cruje sobre la rodilla: se dobla en V y sale un chorro de sangre hacia arriba
        K('k7'); o2.x = f.x + d * 70; L.dy = -rodilla; if (L.parte) L.parte = Math.min(0.5, 0.05 + v * 0.09);
        if (v === 2) { Sound.play('heavy'); this.shake = 20; }
        if (sangre && v % 2 === 0 && v < 20) this.bleed(o2.x, GROUND - rodilla - (o2.m.ko ? o2.m.ko.h * o2.k * 0.5 : 40), d * 0.3, 7, true); if (v >= 22) { fase('fin'); K('k8'); this.komboSuelta(S, f, true); this.shake = 18; Sound.play('fall'); } }
    }
    guionDano(S, f, o, s, can, k, p) {
      if (Math.abs(p.x - o.x) > p.alto * 0.45 + (o.hw || 40) + 20) return;
      const tumbado = o.state === 'down' || o.state === 'getup';
      if (tumbado && o.hp > 0) { S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.03 * k); o.flash = 3; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; return; }
      if (!can) return;
      const blocked = !S.locked && o.guard && (o.free || o.state === 'blockstun');
      o.dir = f.x >= o.x ? 1 : -1;
      if (blocked) { o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.012 * k); o.set('blockstun'); o.stunT = 8; Sound.play('block'); return; }
      S.locked = true; S.hits++; o.hp = Math.max(1, o.hp - s.dmg * f.def.power * 0.06 * k);
      o.set('hit'); o.hitPose = S.hits % 2 && o.m.hit2 ? 'hit2' : 'hit'; o.stunT = 16; o.flash = 3; o.x = clamp(o.x + f.dir * 14, 60, STAGE_W - 60);
      this.spark(o.x + rand(-30, 30), o.y - o.hh * rand(0.2, 0.8), S.color || '#fff', 7);
      if (CFG.sangre !== false && S.hits % 2) this.bleed(o.x, o.y - o.hh * 0.5, f.dir, 6, true);
      this.combo = { n: S.hits, left: f === this.f[0], t: 0 };
    }
    guionSuperStep(S, f, o, s, can) {
      const G = S.G;
      if (S.t === 1) { this.callout(f, G.grito || s.name); Sound.play('whoosh'); }
      this.piezasStep(S, G.piezas, S.t, { f, tx: o.x, hh: o.hh || o.def.height, hit: (p, sp) => { this.guionFx(p, sp); if (sp.dano !== false) this.guionDano(S, f, o, s, can, sp.k || 1, p); } });
      this.shake = Math.max(this.shake, 3);
      if (S.t === S.dur - 8 && can && S.hits) { this.flashT = 8; this.shake = 22; if (this.strike(f, o, s.dmg * f.def.power * 0.35, { special: true, kd: true, color: S.color, fromX: f.x, hx: o.x })) { S.hits++; this.combo = { n: S.hits, left: f === this.f[0], t: 0 }; } }
      if (S.t >= S.dur) this.sup = null;
    }
    // reacción del rematado cuando le llega la pieza: aplasta, vuela, entierra, arrastra o atrapa
    guionReaccion(F, u, gore, pool) {
      const w = F.w, l = F.l, L = l.fat, fin = F.G.final || 'vuela', P = (f, ...ps) => ps.find(q => f.ok(q)) || 'idle';
      if (u === 0) { this.shake = 26; this.flashT = 8; Sound.play('heavy'); Sound.play('ko'); gore(30, true); }
      if (fin === 'aplasta') { L.sy = Math.max(0.25, 1 - u * 0.2); if (u === 0) { l.fpose = P(l, 'ko', 'fall'); pool(l.x + L.dx, 300); } }
      else if (fin === 'entierra') { L.dy = Math.min(70, u * 0.9); if (u === 0) l.fpose = P(l, 'hit2', 'hit'); if (u === 20) l.fpose = P(l, 'ko'); if (u === 0) pool(l.x + L.dx, 220); }
      else if (fin === 'arrastra') { const p = F.lleva; if (p && !p.dead) { L.dx = p.x - l.x; L.dy = Math.min(0, -(p.alto * 0.25)); L.rot = -w.dir * 0.3; l.fpose = P(l, 'fall', 'hit'); } else { L.a = Math.max(0, L.a - 0.1); } }
      else if (fin === 'atrapa') { L.a = Math.max(0, 1 - u / 6); if (u === 3) gore(24, true); }
      else { // 'vuela'
        if (u === 0) { F.vu = { vx: w.dir * rand(6, 9), vy: -24, bote: 0 }; l.fpose = P(l, 'fall', 'hit'); }
        const V = F.vu; if (V && V.bote < 2) { L.dx += V.vx; L.dy += V.vy; V.vy += 1.3; L.rot += 0.22 * w.dir; L.dx = clamp(l.x + L.dx, this.camX + 110, this.camX + W - 110) - l.x;
          if (L.dy >= 0 && V.vy > 0) { L.dy = 0; V.bote++; this.shake = 14; Sound.play('fall'); gore(12, true); V.vy = V.bote < 2 ? -9 : 0; V.vx *= 0.5; L.rot = 0; l.fpose = 'ko'; if (V.bote === 1) pool(l.x + L.dx, 200); } }
      }
    }
    guionFatalStep(F, t, gore, pool) {
      const w = F.w, l = F.l, G = F.G, END = F.end;
      const gi = 1 + Math.min(3, Math.floor(t / (G.ritmo || 22))); if (w.m['gz' + gi]) w.fpose = 'gz' + gi;
      if (t === 2) Sound.play('whoosh');
      this.piezasStep(F, G.piezas, t, { f: w, tx: l.x + l.fat.dx, hh: l.def.height, hit: (p, sp) => { this.guionFx(p, sp); if (sp.remata !== false && !F.impacto) { F.impacto = t; F.lleva = p; } } });
      if (F.impacto) this.guionReaccion(F, t - F.impacto, gore, pool);
      if (t === END) { Sound.play('ko'); this.shake = 14; }
      if (t > END + 120) { this.phase = 'ko'; this.pt = 96; w.wins++; w.fpose = null; l.fpose = null; w.set('win'); l.state = 'dead'; this.banner = ''; }
    }
    guionIndultoStep(F) {
      const w = F.w, l = F.l, L = l.fat, G = F.G, T = ++F.t, P = (f, ...ps) => ps.find(q => f.ok(q)) || 'idle', blood = CFG.sangre !== false;
      F.dark = Math.min(0.3, T / 30); F.conf = F.conf || [];
      const gore = (n, up) => { if (blood) this.bleed(l.x + L.dx, l.y + L.dy - l.def.height * 0.5, w.dir, n, up); };
      const pool = (x, max) => { if (blood) { this.pools = this.pools || []; this.pools.push({ x, r: 8, max }); } };
      if (T === 1) { this.banner = ''; this.callout(w, G.grito || '¡QUEDA USTED INDULTADO!'); Sound.play('special'); }
      const gi = 1 + Math.min(3, Math.floor(T / (G.ritmo || 40))); if (w.m['gy' + gi]) w.fpose = 'gy' + gi;
      if (T > 24 && !F.impacto) { l.fpose = P(l, 'win', 'win2'); L.dy = -Math.abs(Math.sin((T - 24) * 0.25)) * 22; } // lo celebra, sin saber lo que le espera
      if (T === 24) Sound.play('heal');
      if (T > 24 && T < 110 && T % 2 === 0) for (let i = 0; i < 3; i++) F.conf.push({ x: l.x + rand(-420, 420), y: -20 - rand(0, 80), vx: rand(-1.2, 1.2), vy: rand(3, 6), r: rand(0, 6), c: ['#ffe14a', '#e30613', '#fff', '#39d0ff', '#3ddc6a'][Math.floor(rand(0, 5))] });
      this.piezasStep(F, G.piezas, T, { f: w, tx: l.x + L.dx, hh: l.def.height, hit: (p, sp) => { this.guionFx(p, sp); if (sp.remata && !F.impacto) { F.impacto = T; F.lleva = p; L.dy = 0; } } });
      if (F.impacto) { if (T === F.impacto && G.dicho) this.callout(l, G.dicho); this.guionReaccion(F, T - F.impacto, gore, pool); }
      for (const c of F.conf) { c.x += c.vx; c.y += c.vy; c.r += 0.2; }
      F.conf = F.conf.filter(c => c.y < GROUND);
      if (T > 350) { this.phase = 'ko'; this.pt = 96; w.wins++; w.fpose = null; l.fpose = null; l.fat = null; w.set('win'); l.state = 'dead'; this.banner = ''; }
    }
    piezasDraw(P, id, hoja, cam) {
      ctx.save(); ctx.imageSmoothingEnabled = false;
      for (const p of P || []) {
        const key = 'o' + hoja + p.fr, im = IMG[id + '/' + key], M = META[id] && META[id][key]; if (!M || !im || !im.complete || !im.naturalWidth) continue;
        const h = p.alto * p.grow, w = M.w * p.alto / M.h, flip = p.dir * (p.sp.mira || 1) < 0 ? -1 : 1;
        if (h < 2) continue;
        ctx.globalAlpha = p.a; ctx.save(); ctx.translate(Math.round(p.x - cam), Math.round(p.y + (p.yb || 0) - h / 2)); ctx.rotate(p.rot || 0); ctx.scale(flip, 1);
        ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    drawSuperFx(cam) {
      const S = this.sup, f = S.f, t = S.t, grow = Math.min(1, t / 6), fade = Math.min(1, (S.dur - t) / 8);
      const cx = f.x - cam, cy = f.y - f.def.height * 0.58;
      if (S.type === 'guion') { this.piezasDraw(S.P, f.id, 's', cam); return; }
      if (S.type === 'lluvia') { this.lluviaDraw(S, f.def.super, cam); return; }
      if (S.type === 'caida') { this.caidaDraw(S, f.def.super, cam); return; }
      if (S.type === 'sismo') { this.sismoDraw(S, f.def.super, cam); return; }
      if (S.type === 'oso') { this.osoDraw(S, f.def.super, f, cam); return; }
      if (S.type === 'estampida') { // la marabunta de sanitarios, en pixel art, con sombra y polvo
        const d = f.dir, R = Math.round;
        for (const p of S.parts) { ctx.fillStyle = `rgba(200,190,170,${(0.55 * (1 - p.t / 18)).toFixed(2)})`; const r = 8 + p.t * 1.5; ctx.fillRect(R(p.x - cam - r), R(p.y - r - p.t), R(r * 2), R(r * 1.4)); }
        for (const r of S.run || []) {
          const sp = f.def.super, rota = r.para && famHoja(sp.objeto + '_rota'), fo = rota ? Math.min(7, r.dmg) : r.para ? r.fo % 8 : (Math.floor(S.t / 2) + r.fo) % 8, hoja = rota || (sp.familia === 'carga' && famHoja(sp.objeto)); // carga: hoja 4x2 del vehículo (y la de roto al estamparse); estampida: fotogramas sueltos
          const im = hoja || IMG['vfx/' + (sp.tropa || 'medicos') + (1 + fo)]; if (!im || !im.complete || !im.naturalWidth) continue;
          const sw = hoja ? im.naturalWidth / 4 : im.naturalWidth, sh = hoja ? im.naturalHeight / 2 : im.naturalHeight, sx = hoja ? (fo % 4) * sw : 0, sy = hoja ? (fo >> 2) * sh : 0;
          const k = ((rota ? sp.altoRota : 0) || sp.alto || 340) / sh, w = sw * k, h = sh * k, x = R(r.x - cam), y = R(GROUND + r.y * 0.3);
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y - 2, w * 0.4, 10, 0, 0, 7); ctx.fill();
          ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = S.bits ? Math.max(0, Math.min(1, (S.dur - S.t) / 12)) : 1; ctx.translate(x, y); if (d < 0) ctx.scale(-1, 1); ctx.drawImage(im, sx, sy, sw, sh, -w / 2, -h, w, h); ctx.restore();
        }
        for (const q of S.puffs || []) { ctx.fillStyle = `rgba(40,38,40,${(0.6 * (1 - q.age / q.life)).toFixed(2)})`; ctx.fillRect(R(q.x - cam - q.r), R(q.y - q.r), R(q.r * 2), R(q.r * 2)); } // humo de los coches rotos
        for (const b of S.bits || []) { ctx.fillStyle = '#14101a'; ctx.fillRect(R(b.x - cam - b.s / 2 - 1), R(b.y - b.s / 2 - 1), R(b.s + 2), R(b.s + 2)); ctx.fillStyle = b.c; ctx.fillRect(R(b.x - cam - b.s / 2), R(b.y - b.s / 2), R(b.s), R(b.s)); }
        return;
      }
      if (S.type === 'estampa') { // el Falcon en picado, en pixel art grande; al clavarse cambia al dibujo arrugado
        const crash = S.hit && IMG['vfx/falcon_crash'] && IMG['vfx/falcon_crash'].naturalWidth, im = crash ? IMG['vfx/falcon_crash'] : IMG['vfx/falcon_big'];
        if (im && im.complete && im.naturalWidth && S.ny != null) {
          const k = 395 / 128, w = im.naturalWidth * k, h = im.naturalHeight * k, nd = S.nd, u = S.hit ? S.t - S.hit : -1, R = Math.round;
          // la punta del morro del dibujo está a (0.996w, 0.96h); en el arrugado, en (0.983w, 0.975h)
          const dive = u < 0 ? (GROUND - 14 - S.ny) / 0.56 : 0; // antes de clavarse viene en diagonal, siguiendo el eje del avión
          const tipX = 0.974, tipY = 0.934; // entero y arrugado comparten encuadre; mismo tamaño de píxel que los luchadores (395/128)
          const sq = u >= 0 && u < 12 ? Math.sin(u / 12 * Math.PI) * 0.14 : 0; // se aplasta contra el suelo y recupera la forma
          ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(R(S.nx - cam - nd * dive), R(S.ny)); if (nd < 0) ctx.scale(-1, 1); ctx.scale(1 + sq, 1 - sq);
          ctx.drawImage(im, -w * tipX, -h * tipY, w, h); ctx.restore();
          if (u >= 0) {
            const nx = S.nx - cam, ny = S.ny - 20;
            for (const q of S.puffs || []) drawPuff(q.x - cam, q.y, q.r, Math.max(0, (q.age / q.life - 0.55) / 0.45), q.pal); // humo en pixel art
            if (u < 44) for (let i = 0; i < 5; i++) { const fr = (u + i * 5) % 12; ctx.fillStyle = i % 2 ? '#ffb020' : '#ff5a1a'; ctx.fillRect(R(nx - nd * (10 + i * 18) - 8 + fr / 2), R(ny - 14 - fr * 3 - i * 6), R(18 - fr), R(22 - fr)); } // llamas
            for (const b of S.bits || []) { // cristales (brillan) y chapa
              ctx.fillStyle = b.glass && (S.t + b.s | 0) % 6 < 2 ? '#ffffff' : b.c; const x = R(b.x - cam), y = R(b.y);
              if (b.glass) { ctx.fillRect(x, y, R(b.s), 2); ctx.fillRect(x + 2, y - 2, R(b.s * 0.5), 2); } else ctx.fillRect(x, y, R(b.s), R(b.s * 0.5));
            }
          }
        }
        return;
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (S.type === 'beam') {
        const th = (150 + Math.sin(t * 0.9) * 26) * grow * fade, x0 = cx + f.dir * 70, x1 = f.dir > 0 ? W + OX + 60 : -OX - 60, L = Math.abs(x1 - x0) + 260; // llega al borde visible (pantalla ancha)
        const g = ctx.createLinearGradient(0, cy - th / 2, 0, cy + th / 2);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.22, S.color); g.addColorStop(0.42, '#fff'); g.addColorStop(0.58, '#fff'); g.addColorStop(0.78, S.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), cy - th / 2, Math.abs(x1 - x0), th);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x0, cy, th * 0.42, 0, 7); ctx.fill();
        ctx.restore(); vfx('boom' + (Math.floor(t / 3) % 2), x0, cy, th * 2.6, th * 2.9, S.color, 0.9); ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 4; i++) { const d = (t * 46 + i * L / 4) % L; strip('px_disparo', (t >> 2) + i, x0 + f.dir * d, cy + Math.sin(i * 1.7 + t * 0.2) * th * 0.12, 420, 182, f.dir > 0, hueOf(S.color) - 120); }
        for (let i = 0; i < 7; i++) { const d = (t * 34 + i * L / 7) % L; this.drawProj(f.id, x0 + f.dir * d, cy + Math.sin(i * 2.1 + t * 0.35) * th * 0.28, t * 0.3 + i, 74, f.dir < 0); }
      } else if (S.type === 'nova') {
        for (let k = 0; k < 4; k++) { const RM = 720 + OX, r = (t * 16 + k * RM / 4) % RM, al = (1 - r / RM) * fade; ctx.globalAlpha = al; ctx.strokeStyle = S.color; ctx.lineWidth = 34 * al + 5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, r * 0.88, 0, 7); ctx.stroke(); }
        ctx.globalAlpha = 0.16 * fade; ctx.strokeStyle = S.color; ctx.lineWidth = 26;
        for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283 + t * 0.05; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an) * (1100 + 2 * OX), cy + Math.sin(an) * (1100 + 2 * OX)); ctx.stroke(); }
        ctx.restore(); for (const p of S.parts) { vfx('aura' + (p.t >> 2) % 4, p.x - cam, GROUND - 300, 330, 660, S.color, 0.6 - p.t / 30); ctx.globalAlpha = 0.8; strip('px_pilar', p.t / 2, p.x - cam, GROUND - 330, 96, 680, false, hueOf(S.color) - 55); ctx.globalAlpha = 1; } ctx.save();
      } else {
        ctx.strokeStyle = S.color; ctx.lineWidth = 10; ctx.globalAlpha = 0.5;
        for (const p of S.parts) { ctx.beginPath(); ctx.moveTo(p.x - cam, p.y); ctx.lineTo(p.x - cam - p.vx * 5, p.y - p.vy * 5); ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (f.def.super.cachorros) for (const p of S.parts) { const m = META[f.id]['cach' + p.k], im = IMG[f.id + '/cach' + p.k]; if (!m || !im || !im.complete) continue; const q = p.s / Math.max(m.w, m.h); ctx.save(); ctx.translate(p.x - cam, p.y); ctx.rotate(p.rot); ctx.scale(p.dir * q, q); ctx.drawImage(im, -m.w / 2, -m.h / 2, m.w, m.h); ctx.restore(); }
        else if (f.def.super.lava) for (const p of S.parts) { // erupción: rocas de lava en bloques, con su estela
          const sn = v => Math.round(v / 6) * 6, q = sn(p.s * 0.42), x = sn(p.x - cam), y = sn(p.y);
          ctx.fillStyle = '#ff7a1a'; ctx.fillRect(x - sn(p.vx * 2) - q / 3, y - 36, q * 0.66, 24); ctx.fillStyle = '#ffd23f'; ctx.fillRect(x - sn(p.vx) - q / 4, y - 18, q / 2, 18);
          ctx.fillStyle = '#3a1410'; ctx.fillRect(x - q / 2, y - q / 2, q, q); ctx.fillStyle = '#d8340f'; ctx.fillRect(x - q / 2 + 6, y - q / 2 + 6, q - 12, q - 12); ctx.fillStyle = '#ffb02e'; ctx.fillRect(x - 6, y - 6, 12, 12);
        }
        else for (const p of S.parts) this.drawProj(f.id, p.x - cam, p.y, p.rot, p.s, false);
      }
      ctx.restore();
    }
    apagado() { return !!(this.news && this.news.id === 'apagon' && this.phase !== 'finish'); } // fijo, sin parpadeo (Gastón, 12-nov)
    draw() { const c0 = this.camX; this.camX = camVis(c0); NOCHE = this.apagado() && !!nocheDe(this.stage); try { this.drawEscena(); } finally { this.camX = c0; NOCHE = false; } }
    drawEscena() {
      const [a, b] = this.f, cam = this.camX, S = this.sup;
      ctx.save();
      if (this.shake > 0) ctx.translate(rand(-this.shake, this.shake) * 0.6, rand(-this.shake, this.shake) * 0.6);
      const FN = this.fin && this.fin.on ? this.fin : null;
      if (FN && FN.zoom > 1.002) { const cx = clamp((FN.w.x + FN.l.x + FN.l.fat.dx) / 2 - cam, 320, W - 320), cy = GROUND - 110; ctx.translate(cx, cy); ctx.scale(FN.zoom, FN.zoom); ctx.translate(-cx, -cy); }
      fxActors = this.f; drawStage(this.stage, cam, FN ? 0.62 * FN.dark : 0, true, this.apagado()); fxActors = [];
      if (FN) speedLines('#c0101c', FN.t, 0.5 * FN.dark, FN.w.dir);
      if (this.jet) { // el Falcon cruza el cielo por detrás mientras dura el especial
        const j = this.jet, im = IMG['vfx/falcon']; j.t++; j.x += j.dir * 30; const jx = j.x - cam;
        if (im && im.complete && im.naturalWidth) {
          const w = im.naturalWidth * 395 / 128, h = im.naturalHeight * 395 / 128, g = ctx.createLinearGradient(jx - j.dir * 60, 0, jx - j.dir * 760, 0);
          g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g;
          ctx.fillRect(Math.min(jx - j.dir * 160, jx - j.dir * 860), j.y + h * 0.3, 700, 9); ctx.fillRect(Math.min(jx - j.dir * 160, jx - j.dir * 860), j.y + h * 0.45, 700, 6); // estelas desde los motores de cola
          ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(jx), j.y); ctx.scale(j.dir, 1); ctx.drawImage(NOCHE ? tinte(im, 'vfx/falcon|noche', FNOCHE) : im, -w / 2, 0, w, h); ctx.restore();
        }
        if (j.t > 90) this.jet = null;
      }
      if (S) {
        speedLines(S.color, S.t + 80, 0.72 * Math.min(1, (S.dur - S.t) / 10), S.f.dir);
        const cx = S.f.x - cam, cy = S.f.y - S.f.def.height * 0.5, g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 240 + Math.sin(S.t * 0.6) * 20);
        g.addColorStop(0, '#fff'); g.addColorStop(0.35, S.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4; ctx.fillStyle = g; ctx.fillRect(cx - 280, cy - 280, 560, 560); ctx.restore();
        const ah = S.f.def.height * 1.9; vfx('aura' + Math.floor(S.t / 4) % 4, cx, S.f.y - ah * 0.42, ah * 0.9, ah, S.color, 0.95);
      } else if (this.freeze) speedLines(this.freeze.f.def.super.fx, this.freeze.t, 0.8, this.freeze.f.dir);
      for (const p of this.props) {
        const m = PROPS[p.name], im = IMG['prop/' + p.name]; if (!im.complete) continue;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(p.x - cam, GROUND + 6, m.w * 0.45, 9, 0, 0, 7); ctx.fill();
        ctx.drawImage(NOCHE ? tinte(im, 'prop/' + p.name + '|noche', FNOCHE) : im, p.x - cam - m.w / 2, GROUND + 6 - m.h, m.w, m.h);
        if (this.phase === 'fight' && this.f.some(f => !f.cpu && Math.abs(f.x - p.x) < 90)) text('ABAJO + PUÑO', p.x - cam, GROUND - m.h - 14, 9, '#ffe14a');
      }
      this.drawBlood(cam); caosSuelo(this, cam); pintaRestos(this, cam, false); if (this.bonus) bonusPinta(this, cam, 'pila');
      for (const as of this.assists) as.draw(cam);
      // durante un súper con objetos (lluvia, estampida, guion) el rival se pinta por encima de ellos: si no, las jarras, los libros o los robots lo tapan entero y parece que desaparece
      const encima = S && S.t > 0 && ['rain', 'estampida', 'guion', 'lluvia'].includes(S.type) && !S.squash && !S.vic ? S.opp : null;
      const order = a.state === 'attack' ? [b, a] : [a, b]; const SO = S && S.type === 'oso' ? S : this.fin && this.fin.S, tapa = SO && SO.esconde && famHoja(SO.f.def.super.desviste) && famHoja(SO.f.def.super.objeto) ? SO.f : null; // el oso: mientras cabalga o salta, lo pinta osoDraw
      order.forEach(f => { if (f !== encima && f !== tapa && !(this.bonus && f === b)) f.draw(cam); }); // en el bonus el rival es un saco invisible
      for (const p of this.projs) this.drawProj(p.owner.id, p.x - cam, p.y, p.rot, p.size, p.vx < 0);
      for (const p of this.thrown) { const m = PROPS[p.name], im = IMG['prop/' + p.name]; ctx.save(); ctx.translate(p.x - cam, p.y); ctx.rotate(p.rot); ctx.drawImage(NOCHE ? tinte(im, 'prop/' + p.name + '|noche', FNOCHE) : im, -m.w / 2, -m.h / 2, m.w, m.h); ctx.restore(); }
      caosAire(this, cam); pintaRestos(this, cam, true); if (this.bonus) bonusPinta(this, cam, 'aire');
      this.ososDraw(cam); if (S && S.t > 0) this.drawSuperFx(cam);
      if (encima && !(this.bonus && encima === b)) encima.draw(cam);
      for (const e of this.fx) {
        const u = e.t / e.life;
        if (e.type === 'spark') { const sz = 150 + e.n * 16; vfx('hit' + Math.min(7, Math.floor(u * 8)), e.x - cam, e.y, sz, sz * 1.12, e.tint, 1); if (e.n >= 12) strip('px_elec', u * 13, e.x - cam, e.y, 330, 330); }
        else if (e.type === 'burst') { // estallido de líneas de velocidad, en bloques (pixel art) y sin tocar los dibujos
          ctx.save(); ctx.globalAlpha = 1 - u; ctx.fillStyle = u < 0.3 ? '#fff' : '#ffe14a';
          for (let i = 0; i < 14; i++) { const an = e.rot * 6.28 + i * 6.28 / 14, r0 = 70 + u * 120, len = 90 * (1 - u) + 20, w = i % 2 ? 6 : 10;
            ctx.save(); ctx.translate(e.x - cam + Math.cos(an) * r0, e.y + Math.sin(an) * r0); ctx.rotate(an); ctx.fillRect(0, -w / 2, len, w); ctx.restore(); }
          ctx.restore();
        }
        else if (e.type === 'puff') drawPuff(e.x - cam, e.y, 40 + u * 60, u, 'gris');
        else if (e.type === 'maletero') drawHumo(e, cam);
        else if (e.type === 'sf') {
          if (e.solo === 'sangre' && !sangreVer()) continue; if (!e.sf) e.sf = sfNuevo(e.tipo, e.x, e.opts, e.y); if (!e.sf) { e.t = e.life; continue; }
          if (e.follow) e.sf.x = e.follow.x; if (e.stopAfter && e.t > e.stopAfter && !e.parado) { e.parado = true; e.sf.fx.stop && e.sf.fx.stop(); }
          sfDibuja(e.sf, cam); if (e.sf.done) e.t = e.life;
        }
        else if (e.type === 'mboom') { if (window.SF_VFX) { if (!e.sf) e.sf = sfNuevo('explosion', e.x, { ancho: 420, alto: 340, size: e.size || 1.5, seed: Math.floor(e.seed * 1000) + 1, surface: 0xff3a4a5a, fire: 0.7 }); sfDibuja(e.sf, cam); if (e.sf && e.sf.done) e.t = e.life; } else pxExplosion(e, cam); }
        else if (e.type === 'boom') { vfx('boom' + Math.min(3, Math.floor(u * 4)), e.x - cam, e.y, 560, 610, e.tint, 0.6 * (1 - u * 0.5)); ctx.save(); ctx.globalAlpha = 0.42 * (1 - u * 0.6); strip('px_boom', u * 15, e.x - cam, e.y - 30, 470, 470); ctx.restore(); } /* el humo de la explosión es opaco: semitransparente para que no se «coma» al rival (los jugadores decían que desaparecía en el súper) */
        else { e.y += e.vy; text('+', e.x - cam, e.y, 26, '#6dff8a'); }
      }
      this.drawFinish(cam);
      if (this.phase === 'finish' && this.fin && this.fin.ready && !this.fin.on && Math.floor(this.pt / 12) % 2) text(this.fin.w.cpu ? '' : 'SÚPER: REMATAR   ·   ESPECIAL: INDULTAR', W / 2, 380, 14, '#fff', 'center', '#7a0d0d');
      for (const c of this.calls) { ctx.globalAlpha = c.t > 45 ? (60 - c.t) / 15 : 1; text(String(c.s).toUpperCase(), clamp(c.f.x - cam, 300, W - 300), Math.max(160, c.f.y - c.f.def.height - 34 - c.t * 0.3), 26, '#ffe14a', 'center', '#3a0606'); ctx.globalAlpha = 1; }
      caosCapa(this, cam);
      ctx.restore();
      if (this.fin && this.fin.on) this.drawRayosX(this.fin);
      if (S || this.freeze) { ctx.fillStyle = '#000'; ctx.fillRect(-OX, 0, VW, 14); ctx.fillRect(-OX, H - 14, VW, 14); }
      this.hud();
      if (this.freeze) this.drawFreeze();
      if (this.combo) {
        const c = this.combo, pop = 1 + Math.max(0, 6 - c.t) * 0.06, x = c.left ? 240 : W - 240;
        ctx.save(); ctx.translate(x, 210); ctx.rotate(c.left ? -0.08 : 0.08); ctx.scale(pop, pop); ctx.globalAlpha = c.t > 70 ? (90 - c.t) / 20 : 1;
        text(String(c.n), 0, 0, 74, '#ffe14a', 'center', '#7a0d0d'); text(c.n > 1 ? 'GOLPES' : 'GOLPE', 0, 56, 28, '#fff', 'center', '#7a0d0d');
        const fr = c.n >= 15 ? '¡ELECCIONES ANTICIPADAS!' : c.n >= 10 ? '¡MOCIÓN DE CENSURA!' : c.n >= 7 ? '¡CUESTIÓN DE CONFIANZA!' : c.n >= 5 ? '¡DIMISIÓN!' : c.n >= 3 ? '¡TOMA YA!' : '';
        if (fr) text(fr, 0, 100, 24, '#ff7a3a', 'center', '#3a0606'); ctx.restore();
      }
      if (this.mode === 'training' && this.phase === 'fight') { // panel de entrenamiento: qué golpe sale y cuánto quita
        const a = this.f[0], N = { punch: 'PUÑO', kick: 'PATADA', low: 'BARRIDO', air: 'PATADA AÉREA', airp: 'PUÑO AÉREO', gancho: 'GANCHO', slide: 'DESLIZAMIENTO', cargado: 'PUÑO CARGADO', antiaereo: 'ANTIAÉREO', sp1: a.def.sp1.name, sp2: a.def.sp2.name, super: a.def.super.name, throw: 'LANZAMIENTO' };
        if (a.state === 'attack' && N[a.moveName]) this.trLast = { n: N[a.moveName].toUpperCase(), t: 0 };
        if (this.trLast && ++this.trLast.t < 120) text(this.trLast.n, W / 2, 150, 16, '#ffe14a', 'center', '#000');
        text('ENTRENAMIENTO  ·  EL RIVAL NO ATACA  ·  ESC: PAUSA', W / 2, H - 26, 10, '#fff', 'center', '#000');
      }
      if (this.flashT > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.5, this.flashT / 14)})`; ctx.fillRect(-OX, 0, VW, H); } /* destello: nunca a pantalla blanca entera (molesta y es malo para fotosensibles) */
      if (this.banner && (this.phase !== 'fight')) { const s = Math.min(1, this.bt / 8); if (!titular(this.banner, this.bt)) text(this.banner, W / 2, 300, 34 + 30 * s, /K\.O\./.test(this.banner) ? '#ff3b30' : '#ffe14a'); if (this.sub && this.phase === 'ko') text(this.sub, W / 2, 470, 22, '#fff'); }
    }
    drawFreeze() {
      const { f, t } = this.freeze, left = f.dir > 0, e = 1 - Math.pow(1 - Math.min(1, t / 14), 3), col = f.def.super.fx, out = t > 64 ? (t - 64) / 10 : 0;
      ctx.save(); ctx.globalAlpha = 1 - out;
      // banda inclinada
      ctx.save(); ctx.transform(1, -0.12, 0, 1, 0, 80); const bx = -OX - 60, bw = (VW + 120) * e; ctx.fillStyle = col; ctx.fillRect(bx, 150, bw, 330); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(bx, 150, bw, 16); ctx.fillRect(bx, 464, bw, 16);
      ctx.fillStyle = '#fff'; ctx.fillRect(bx, 140, bw, 6); ctx.fillRect(bx, 484, bw, 6); ctx.restore();
      // primer plano
      const im = IMG[f.id + '/cutin'], ch = 470 + OX * 0.35, cw = im && im.naturalWidth ? ch * im.naturalWidth / im.naturalHeight : 0, drift = t * 1.2;
      if (cw) {
        ctx.save();
        // el primer plano se recorta a la banda inclinada (así la cabeza y el cuerpo no asoman con un corte recto) y su borde trasero se remata en diagonal
        { const x0 = -OX - 60, x1 = W + OX + 60, y0 = 236 - (x0 + 50) * 0.12, y1 = 236 - (x1 + 50) * 0.12; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 + 330); ctx.lineTo(x0, y0 + 330); ctx.closePath(); ctx.clip(); }
        const sx = OX ? OX + 100 : 0, sy = 120 - OX * 0.2; if (left) { ctx.translate(-sx - cw + (cw - 20) * e + drift, sy + OX * 0.12); } else { ctx.translate(W + sx + cw - (cw - 20) * e - drift, sy - OX * 0.12); ctx.scale(-1, 1); } // pegado al borde real de la pantalla
        ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(cw + 42, 0); ctx.lineTo(cw - 78, ch); ctx.lineTo(-40, ch); ctx.closePath(); ctx.clip();
        ctx.drawImage(im, 0, 0, cw, ch);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cw + 30, 0); ctx.lineTo(cw + 42, 0); ctx.lineTo(cw - 78, ch); ctx.lineTo(cw - 90, ch); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      else ctx.drawImage(IMG[f.id + '/face'], left ? 60 - OX : W + OX - 420, 150, 360, 360);
      // nombre del súper
      const tx = left ? W - 110 - (1 - e) * 500 : 40 + (1 - e) * 500; // el texto va inclinado y desplazado: a la derecha necesita más margen para no salirse
      ctx.save(); ctx.transform(1, 0, -0.22, 1, 0, 0); ctx.translate(120 * (left ? 1 : 1), 0);
      const name = f.def.super.name; ctx.font = `40px ${FONT}`; const size = Math.min(40, 40 * 600 / Math.max(600, ctx.measureText(name).width));
      text(name, tx, 300, size, '#fff', left ? 'right' : 'left', '#000'); text(f.def.name, tx, 358, 16, '#ffe14a', left ? 'right' : 'left'); ctx.restore();
      ctx.restore();
      if (t < 6) { ctx.fillStyle = `rgba(255,255,255,${1 - t / 6})`; ctx.fillRect(-OX, 0, VW, H); }
    }
    hud() {
      if (this.bonus) return bonusHud(this);
      const [a, b] = this.f, bw = 470;
      for (const [f, left] of [[a, true], [b, false]]) {
        const x = left ? 96 : W - 96 - bw, r = f.hp / f.maxHp, rl = f.lag / f.maxHp;
        ctx.fillStyle = '#000'; ctx.fillRect(x - 4, 36, bw + 8, 34); ctx.fillStyle = '#7a0d0d'; ctx.fillRect(x, 40, bw, 26);
        const rc = Math.max(f.rec || 0, f.hp) / f.maxHp; ctx.fillStyle = '#b0123a'; ctx.fillRect(left ? x + bw * (1 - rc) : x, 40, bw * rc, 26); // vida roja (recuperable al cambiarte)
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let sx = 0; sx < bw * rc; sx += 12) ctx.fillRect(left ? x + bw - sx - 6 : x + sx, 40, 4, 26);
        ctx.fillStyle = '#ff5a3c'; ctx.fillRect(left ? x + bw * (1 - rl) : x, 40, bw * rl, 26);
        ctx.fillStyle = r < 0.25 ? '#ff9d2e' : '#ffe14a'; ctx.fillRect(left ? x + bw * (1 - r) : x, 40, bw * r, 26);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, 40, bw, 7);
        const px = left ? 8 : W - 88; ctx.fillStyle = f.def.color; ctx.fillRect(px, 20, 80, 80); ctx.save(); ctx.translate(px + (left ? 0 : 80), 20); ctx.scale(left ? 1 : -1, 1); { const fi = (f.beaten && IMG[f.id + '/face_x']) || IMG[f.id + '/face']; if (fi && fi.naturalWidth !== 0) ctx.drawImage(fi, 0, 0, 80, 80); } /* sin retrato apaleado (o aún cargando): el normal; nunca romper el marcador */ ctx.restore();
        ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeRect(px, 20, 80, 80);
        text(f.def.name, left ? x : x + bw, 88, Math.min(15, Math.floor((bw - 74) / f.def.name.length)), '#fff', left ? 'left' : 'right'); // los nombres largos se encogen para no pisar los asaltos
        for (let i = 0; i < 2; i++) { ctx.fillStyle = i < f.wins ? '#ffe14a' : '#333'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(left ? x + bw - 14 - i * 30 : x + 14 + i * 30, 90, 10, 0, 7); ctx.fill(); ctx.stroke(); }
        // apoyo
        const aw = 150, ax = left ? x : x + bw - aw, ready = f.assistCd <= 0, af = 1 - Math.max(0, f.assistCd) / ASSIST_CD;
        ctx.fillStyle = '#000'; ctx.fillRect(ax - 2, 108, aw + 4, 14); ctx.fillStyle = ready ? '#3ddc6a' : '#8a8a8a'; ctx.fillRect(left ? ax : ax + aw * (1 - af), 110, aw * af, 10);
        const al = f.allyDef, fx = left ? ax + aw + 8 : ax - 8 - 30;
        if (al) { ctx.fillStyle = al.color; ctx.fillRect(fx, 100, 30, 30); ctx.globalAlpha = ready ? 1 : 0.45; ctx.drawImage(IMG[al.id + '/face'], fx, 100, 30, 30); ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.strokeStyle = ready ? '#3ddc6a' : '#888'; ctx.strokeRect(fx, 100, 30, 30); }
        const rv = this.res[left ? 0 : 1];
        if (al && rv) { const rr = Math.max(0, rv.hp / rv.maxHp); ctx.fillStyle = '#000'; ctx.fillRect(fx - 1, 131, 32, 7); ctx.fillStyle = '#b0123a'; ctx.fillRect(fx, 132, 30 * Math.max(0, Math.max(rv.rec || 0, rv.hp) / rv.maxHp), 5); ctx.fillStyle = rr > 0.25 ? '#ffe14a' : '#ff5a3c'; ctx.fillRect(fx, 132, 30 * rr, 5); if (rr <= 0) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(fx, 100, 30, 30); ctx.fillStyle = '#ff5a3c'; for (let k = 0; k < 6; k++) { ctx.fillRect(fx + 4 + k * 4, 104 + k * 4, 4, 4); ctx.fillRect(fx + 22 - k * 4, 104 + k * 4, 4, 4); } } } // aliado K.O.: una X de píxel (el texto no cabía en el cuadrito)
        const RG = RASGOS[f.rasgo]; if (RG) text(RG.n + (f.rasgo === 'resistencia' && f.resUsada ? ' (GASTADO)' : ''), left ? x : x + bw, 146, 7, f.rasgo === 'remontada' && f.hp < f.maxHp * 0.3 ? '#ff5a3c' : '#ffe14a', left ? 'left' : 'right');
        const tagOk = rv && rv.hp > 0 && this.tagCd[left ? 0 : 1] <= 0;
        if (ESTILO !== 'puno') text(ready ? 'APOYO LISTO' : 'APOYO', left ? ax + aw + 46 : ax - 46, 115, 9, ready ? '#3ddc6a' : '#bbb', left ? 'left' : 'right');
        if (tagOk && ESTILO !== 'puno') text('ABAJO+ALIADO: CAMBIO', left ? ax + aw + 46 : ax - 46, 132, 7, '#9fd8ff', left ? 'left' : 'right');
        // barra de súper
        const mw = 300, mx = left ? 40 : W - 40 - mw, full = f.meter >= 100;
        ctx.fillStyle = '#000'; ctx.fillRect(mx - 3, H - 43, mw + 6, 22); ctx.fillStyle = '#1c2340'; ctx.fillRect(mx, H - 40, mw, 16);
        ctx.fillStyle = full ? (Math.floor(Date.now() / 120) % 2 ? '#fff' : '#39d0ff') : '#2f7bff'; const mwf = mw * f.meter / 100; ctx.fillRect(left ? mx : mx + mw - mwf, H - 40, mwf, 16);
        if (ESTILO === 'puno' && f.cabreo > 0) { ctx.fillStyle = Math.floor(Date.now() / 90) % 2 ? '#ff5a1f' : '#ffd25a'; ctx.fillRect(left ? mx : mx + mw - mw * f.cabreo / CABREO_T, H - 40, mw * f.cabreo / CABREO_T, 16); }
        const nb = ESTILO === 'puno' ? 'CABREO' : 'SÚPER';
        text(ESTILO === 'puno' && f.cabreo > 0 ? '¡CABREADO!' : full ? '¡' + nb + ' LISTO!' : nb, left ? mx : mx + mw, H - 58, 11, full || f.cabreo > 0 ? '#ffe14a' : '#cfd6ff', left ? 'left' : 'right');
      }
      ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 46, 22, 92, 64); ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 4; ctx.strokeRect(W / 2 - 46, 22, 92, 64);
      text(String(Math.max(0, Math.ceil(this.time / 60))).padStart(2, '0'), W / 2, 56, 32, '#fff');
      caosTicker(this);
    }
  }

  // ---------- Pantallas ----------
  // enlace de invitación al modo online: jugar.html?sala=ABCD
  // prueba del reto final: jugar.html?reto=trump (o ?reto=1 para uno al azar) salta al reto al pulsar ENTER en la portada
  let RETO_PRUEBA = new URLSearchParams(location.search).get('reto') || '';
  // prueba del final: jugar.html?final=1 lleva de la portada a elegir personaje y de ahí al último combate del arcade (la Moncloa), con su final y el reto
  let FINAL_PRUEBA = !!new URLSearchParams(location.search).get('final');
  const APAGON_PRUEBA = !!new URLSearchParams(location.search).get('apagon'); // ?apagon=1: laboratorio con apagón fijo; 8/9 cambian de escenario
  let SALA = (new URLSearchParams(location.search).get('sala') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const S = { dif: 'medio', screen: 'loading', t: 0, mode: 'arcade', modeSel: 0, sel: [0, 1], picked: [false, false], asel: [1, 0], apicked: [false, false], statsPage: 0, stageSel: 0, match: null, ladder: [], step: 0, result: null };
  function go(screen) { S.screen = screen; S.t = 0; S.paused = false; if (screen === 'mode') S.keepRun = false; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
  // Carteles de menú: panel de píxel con esquinas en escalera, doble borde y fondo animado (recortado al panel)
  function pxCaja(x, y, w, h, s, col) { ctx.fillStyle = col; ctx.fillRect(x + s * 2, y, w - s * 4, h); ctx.fillRect(x + s, y + s, w - s * 2, h - s * 2); ctx.fillRect(x, y + s * 2, w, h - s * 4); }
  function cartel(x, y, w, h, a, b, on, luz, fx) {
    x = Math.round(x / 2) * 2; y = Math.round(y / 2) * 2; const q = 8;
    pxCaja(x + 8, y + 10, w, h, q, 'rgba(0,0,0,0.55)'); pxCaja(x, y, w, h, q, '#0c0614'); pxCaja(x + 4, y + 4, w - 8, h - 8, q, on ? (Math.floor(S.t / 10) % 2 ? '#ffe14a' : '#fff6b8') : '#3b4058'); pxCaja(x + 10, y + 10, w - 20, h - 20, q, '#0c0614');
    ctx.save(); ctx.beginPath(); ctx.rect(x + 14 + q, y + 14, w - 28 - q * 2, h - 28); ctx.rect(x + 14, y + 14 + q, w - 28, h - 28 - q * 2); ctx.clip();
    const bandas = 7, iy = y + 14, ih = h - 28; for (let i = 0; i < bandas; i++) { const k = i / (bandas - 1), A = rRgb(a), B = rRgb(b), c = rMix(A, B, k), g = on ? c : rMix(c, [34, 36, 50], 0.72); ctx.fillStyle = `rgb(${g[0]},${g[1]},${g[2]})`; ctx.fillRect(x, iy + Math.floor(i * ih / bandas), w, Math.ceil(ih / bandas) + 1); }
    if (fx) fx(); ctx.restore();
  }
  function fxTurbo(x, y, w, h, on) { // líneas de velocidad y llamas de bloques
    const t = S.t * (on ? 1 : 0.15); ctx.globalAlpha = on ? 0.55 : 0.12; ctx.fillStyle = '#ffd98a';
    for (let i = 0; i < 16; i++) { const yy = y + 20 + (i * 53 % (h - 40)), ln = 40 + (i * 37 % 90), xx = x + w - ((t * (9 + i % 5) + i * 91) % (w + ln)); ctx.fillRect(Math.round(xx / 4) * 4, Math.round(yy / 4) * 4, ln, 4); }
    ctx.globalAlpha = on ? 1 : 0.22; const cols = [['#b00f2c', 30], ['#ff5a1f', 20], ['#ffb01f', 12], ['#fff2a8', 5]], q = 12;
    for (const [c, alto] of cols) { ctx.fillStyle = c; for (let i = 0; i * q < w; i++) { const n = Math.sin(i * 1.7 + t * 0.21) + Math.sin(i * 0.63 - t * 0.13) * 0.8 + Math.sin(i * 3.1 + t * 0.34) * 0.4, a = Math.max(0, Math.round((alto + n * alto * 0.42) / 6) * 6); ctx.fillRect(x + i * q, y + h - a, q, a); } }
    ctx.globalAlpha = 1;
  }
  function fxNormal(x, y, w, h, on) { // rejilla de recreativa que avanza despacio y una fila de luces
    const t = S.t * (on ? 1 : 0); ctx.globalAlpha = on ? 0.2 : 0.07; ctx.fillStyle = '#9fd0ff';
    for (let i = -1; i * 32 < w + 32; i++) ctx.fillRect(x + i * 32 + Math.floor(t * 0.25) % 32, y, 2, h);
    for (let i = -1; i * 32 < h + 32; i++) ctx.fillRect(x, y + i * 32 + Math.floor(t * 0.25) % 32, w, 2);
    ctx.globalAlpha = on ? 0.9 : 0.2; for (let i = 0; i * 28 < w; i++) { ctx.fillStyle = (i + Math.floor(t / 9)) % 4 === 0 ? '#ffe14a' : '#2a5fc0'; ctx.fillRect(x + 18 + i * 28, y + h - 34, 12, 12); }
    ctx.globalAlpha = 1;
  }
  function chips(x, y, n, llenos, w, h, col, vivo) { for (let i = 0; i < n; i++) { const X = x + i * (w + 8); ctx.fillStyle = '#0c0614'; ctx.fillRect(X - 3, y - 3, w + 6, h + 6); const lit = i < llenos, late = vivo >= 0 && i >= llenos - 2 && Math.floor(vivo / 5 + i) % 3 === 0; ctx.fillStyle = lit ? (late ? '#fff' : col) : '#262a3c'; ctx.fillRect(X, y, w, h); if (lit) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(X, y, w, 4); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(X, y + h - 4, w, 4); } } }
  function pxFlecha(x, y) { for (let i = 0; i < 6; i++) { ctx.fillStyle = '#0c0614'; ctx.fillRect(x - 26 + i * 4, y - 22 + i * 4 + 8, 52 - i * 8, 8); } for (let i = 0; i < 5; i++) { ctx.fillStyle = i < 2 ? '#fff6b8' : '#ffe14a'; ctx.fillRect(x - 20 + i * 4, y - 18 + i * 4 + 8, 40 - i * 8, 4); ctx.fillRect(x - 20 + i * 4, y - 16 + i * 4 + 8, 40 - i * 8, 4); } }
  // logo animado de la plantilla (titulos-meta.js): entra una vez y luego se queda en los últimos fotogramas, en bucle
  function logoAnim(k, cx, cy, q, t) { const m = TIT[k], im = IMG['tit/' + k]; if (!m || !im || !im.complete || !im.naturalWidth) return false; const tail = m.n >> 1, i = t < m.n ? t : m.n - tail + (t % tail), w = m.w * q, h = m.h * q, was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(im, (i % m.cols) * m.w, Math.floor(i / m.cols) * m.h, m.w, m.h, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h); ctx.imageSmoothingEnabled = was; return true; }
  // opción de menú: la elegida crece y lleva dos flechas de píxel que laten a los lados (sin cambiar el texto, así no vuelve a caer letra a letra)
  function txtAncho(s, size) { s = String(s); size = tam(size); if (size >= R_MIN && rListo) return rAncho(s, size); ctx.font = `${size}px ${FONT}`; return ctx.measureText(s.replace(/[ÁÉÍÓÚÑÜ]/g, c => UPPER[c])).width + Math.max(4, size * 0.3); } // ancho real con el que lo pinta text()
  const ajCache = new Map();
  function ajusta(s, size, maxW) { // el mayor tamaño (hasta «size») con el que el texto cabe en maxW
    const k = s + '|' + size + '|' + Math.round(maxW) + '|' + TMIN; let z = ajCache.get(k); if (z) return z;
    z = size; while (z > 8 && txtAncho(s, z) > maxW) z--; if (ajCache.size > 500) ajCache.clear(); if (rListo) ajCache.set(k, z); return z;
  }
  function rAncho(s, size) { const fs = Math.round(size * 1.3 / RQ); rCan.font = `${fs}px ${RFONT}`; return (rCan.measureText(s).width + (s.split(' ').length - 1) * Math.max(2, Math.round(fs * 0.16))) * RQ; }
  function opcion(o, x, y, on, col, sOn, sOff) {
    text(o, x, y, on ? (sOn || 30) : (sOff || 24), col); if (!on) return;
    const d = rAncho(o, sOn || 30) / 2 + 18 + Math.round(Math.abs(Math.sin(S.t * 0.13)) * 4) * 2;
    for (const k of [-1, 1]) { // punta hacia el texto
      for (let j = 0; j < 5; j++) { const X = x + k * (d + j * 4) - 2, a = (j + 1) * 3; ctx.fillStyle = '#0c0614'; ctx.fillRect(X - 3, y - a - 3, 10, a * 2 + 6); }
      for (let j = 0; j < 5; j++) { const X = x + k * (d + j * 4) - 2, a = (j + 1) * 3; ctx.fillStyle = j < 2 ? '#fff6b8' : '#ffe14a'; ctx.fillRect(X, y - a, 4, a * 2); }
    }
  }
  function bg(id, dark) { drawStage(id, (STAGE_W - W) / 2 + Math.sin(S.t * 0.004) * 200, dark, true); }

  const TEL_FRAMES = 24; // fotogramas del teléfono sonando (assets/ui/tel_NN.webp)
  function startEnding(f, al) {
    const img = new Image(); img.src = V('assets/ui/final_' + f.id + '.png');
    ensure([f.id, al && al.id]); ensureStage('moncloa');
    const tel = new Image(); tel.src = V('assets/ui/telefono.png'); const telf = Array.from({ length: TEL_FRAMES }, (_, i) => { const q = new Image(); q.src = V(`assets/ui/tel_${String(i + 1).padStart(2, '0')}.webp`); return q; });
    S.end = { f, al: al && al.id !== f.id ? al : null, img, conf: [], flash: [], tel, telf, gob: gobierno() }; Sound.music('moncloa'); go('ending');
    const fin = leer('mf_finales', []); if (!fin.includes(f.id)) { fin.push(f.id); guardar('mf_finales', fin); } // para la GALERÍA
  }
  // RETO FINAL: tras la celebración sale al azar un presidente extranjero (de los que aún no tienes) con un conflicto inventado.
  // Un solo combate, sin aliados, contra una CPU al máximo y reforzada: si ganas, lo desbloqueas; si pierdes, se acabó el reto.
  function startReto(id) {
    const vistos = S.retosVistos || (S.retosVistos = []), all = FIGHTERS.filter(f => f.secret && !f.soloCodigo && !vistos.includes(f.id)), pend = all.filter(f => !Unlock.has(f)), pool = pend.length ? pend : all;
    const boss = (id && byId(id)) || pool[Math.floor(Math.random() * pool.length)];
    if (boss) { vistos.push(boss.id); S.retosLeft = Math.max(0, (S.retosLeft || 1) - 1); } // MEDIO: 1 reto, DIFÍCIL: 2, EXTRADIFÍCIL: 3, uno detrás de otro
    if (!boss) { Sound.music('moncloa'); go('creditos'); return; }
    const stage = STAGES.some(st => st.id === boss.stage) ? boss.stage : 'exteriores';
    ensure([boss.id, FIGHTERS[S.sel[0]].id]); ensureStage(stage);
    S.reto = { boss, stage, nuevo: !Unlock.has(boss), n: vistos.length, de: vistos.length + S.retosLeft }; Sound.music('menu'); go('reto');
  }
  // los escenarios internacionales son una sorpresa: solo se pueden elegir tras desbloquear a su presidente
  function stagesVisibles() { return STAGES.filter(st => !st.secreto || (byId(st.secreto) && Unlock.has(byId(st.secreto)))); }
  function resetPicks() { S.picked = [false, false]; S.apicked = [false, false]; }
  const sinAliado = () => S.mode === 'mocion' || S.mode === 'conflictos'; // modos de uno contra uno: no se pide aliado (lo avisó un probador)
  // modo arcade: se recorre el camino a la Moncloa (RUTA); antes de cada combate se enseña el mapa
  const RUTA = window.RUTA || [];
  const ZONA_DE = {}; Object.entries(window.ZONAS || {}).forEach(([z, l]) => l.forEach(id => { ZONA_DE[id] = z; }));
  const zonaDe = st => ZONA_DE[st] || 'madrid'; // lo que no es de otra zona es de Madrid
  // por dificultad: personajes que desbloquea y presidentes extranjeros que llaman al teléfono rojo al llegar a la Moncloa
  const DIFS = ['facil', 'medio', 'dificil', 'extra'], DIF_PREMIO = { facil: 0, medio: 1, dificil: 2, extra: 3 }, DIF_RETOS = { facil: 0, medio: 1, dificil: 2, extra: 3 };
  // personas que pueden salir (Ábalos y Ábalos preso cuentan como una), cada una con todas sus versiones
  function personasLibres(fuera) {
    const m = new Map();
    FIGHTERS.filter(f => !f.secret && !f.vetado && !fuera.has(BASEF(f))).forEach(f => { const k = BASEF(f); if (!m.has(k)) m.set(k, []); m.get(k).push(f); });
    return m;
  }
  // la versión con la que sale de rival: la de ese escenario (Ábalos preso en Soto del Real) y, si no, una desbloqueada
  const version = (vs, st) => vs.find(f => f.stage === st && Unlock.has(f)) || vs.find(f => f.stage === st) || vs.find(f => Unlock.has(f)) || vs[0];
  // el último combate es en la Moncloa contra su inquilino; si lo llevas tú (o de aliado), te espera Feijóo
  function jefeFinal(me, al) {
    const fuera = new Set([BASEF(me), al && BASEF(al)]);
    return ['sanchez', 'feijoo'].map(byId).find(f => f && !fuera.has(BASEF(f))) || shuffle(FIGHTERS.filter(f => !f.variantOf && !f.secret && !f.vetado && Unlock.has(f) && !fuera.has(f)))[0];
  }
  // rivales del arcade: cada uno en su propio escenario o, si no, en otro de su zona; nunca dos veces la misma persona.
  // Entre los posibles, primero los desbloqueados y los que no salieron en la última partida. desde > 0: rehace solo lo que falta.
  function montarRivales(desde) {
    const me = FIGHTERS[S.sel[0]], al = S.asel && FIGHTERS[S.asel[0]], R = S.route, boss = jefeFinal(me, al), lista = (S.ladder || []).slice(0, desde);
    const libres = personasLibres(new Set([BASEF(me), al && BASEF(al), BASEF(boss)].concat(lista.map(BASEF))));
    let ultimos = []; try { ultimos = JSON.parse(localStorage.getItem('mf_ultimos_rivales') || '[]'); } catch (e) { }
    const coger = (i, cands) => {
      if (!cands.length) return false; const st = R[i].stage;
      const el = cands.map(([k, vs]) => { const f = version(vs, st); return [k, f, (Unlock.has(f) ? 0 : 4) + (ultimos.includes(k.id) ? 2 : 0) + Math.random()]; }).sort((x, y) => x[2] - y[2])[0];
      lista[i] = el[1]; libres.delete(el[0]); return true;
    };
    const deCasa = i => [...libres].filter(([, vs]) => vs.some(f => f.stage === R[i].stage));
    lista.length = R.length - 1; let pend = []; for (let i = desde; i < R.length - 1; i++) pend.push(i);
    // rivales ya fijados (las PRIMARIAS de HISTORIA): no se tocan y nadie más puede ser ellos
    pend.filter(i => R[i].rival).forEach(i => { lista[i] = R[i].rival; libres.delete(BASEF(R[i].rival)); }); pend = pend.filter(i => !R[i].rival);
    for (let i = 0; i < desde; i++) if (lista[i]) libres.delete(BASEF(lista[i]));
    for (;;) { // 1) en su propio escenario, empezando por el que tiene menos candidatos para no quitarle el sitio a nadie
      const c = pend.map(i => [i, deCasa(i)]).filter(x => x[1].length).sort((x, y) => x[1].length - y[1].length)[0];
      if (!c) break; coger(c[0], c[1]); pend = pend.filter(i => i !== c[0]);
    }
    const zonaP = vs => zonaDe(BASEF(vs[0]).stage); // 2) alguien de su zona, 3) un político nacional (de Madrid), 4) quien quede
    pend.forEach(i => { const z = zonaDe(R[i].stage), L = [...libres]; coger(i, L.filter(([, vs]) => zonaP(vs) === z)) || coger(i, L.filter(([, vs]) => zonaP(vs) === 'madrid')) || coger(i, L); });
    for (let i = R.length - 2; i >= desde; i--) if (!lista[i]) { R.splice(i, 1); lista.splice(i, 1); } // por si faltaran personas: un combate menos antes que repetir
    S.ladder = lista.concat(boss);
    if (!desde) try { localStorage.setItem('mf_ultimos_rivales', JSON.stringify(lista.map(f => BASEF(f).id))); } catch (e) { }
    montarAliados(desde);
  }
  // aliado del rival en cada combate: nunca repetido y nunca alguien contra quien luchas en esta partida (ni tu aliado).
  // Si se acaban las caras nuevas (solo pasa en EXTRADIFÍCIL), vuelve alguien a quien ya ganaste, a por la revancha.
  function montarAliados(desde) {
    const me = FIGHTERS[S.sel[0]], al = S.asel && FIGHTERS[S.asel[0]], L = S.ladder, A = (S.allyLadder || []).slice(0, desde);
    const usados = new Set(A.filter(Boolean).map(BASEF)), rival = new Map(L.map((f, i) => [BASEF(f), i])), pers = personasLibres(new Set([BASEF(me), al && BASEF(al)]));
    for (let k = desde; k < L.length; k++) {
      const opp = L[k], c = [];
      pers.forEach((vs, b) => {
        if (b === BASEF(opp) || usados.has(b)) return; const f = Unlock.has(b) ? b : vs.find(v => Unlock.has(v)); if (!f) return;
        const r = rival.get(b); c.push([f, (r === undefined ? 0 : r < k ? 10 : 20) + (affine(opp, f) ? 0 : 2) + Math.random()]);
      });
      const el = c.sort((x, y) => x[1] - y[1])[0]; A[k] = el ? el[0] : null; if (el) usados.add(BASEF(el[0]));
    }
    S.allyLadder = A;
  }
  // ¿hay alguien que pueda pelear en su propio escenario?
  const hayCasa = (st, fuera) => FIGHTERS.some(f => f.stage === st && !f.secret && !f.vetado && !fuera.has(BASEF(f)));
  const preferir = (ids, fuera) => { const c = ids.filter(id => STAGES.some(s => s.id === id)), b = c.filter(id => hayCasa(id, fuera)); return shuffle((b.length ? b : c).slice())[0]; };
  // DIFÍCIL y EXTRADIFÍCIL: una vuelta por España y, cuando se acaba, Madrid de parada en parada hasta la Moncloa.
  // EXTRADIFÍCIL pasa por todos los escenarios; DIFÍCIL, por una parada de cada zona de España y 9 de Madrid.
  function rutaDificil(todo, fuera) {
    const D = window.RUTA_DIFICIL, sin = shuffle(D.vueltas.slice())[0], espana = [], quedan = todo ? null : new Set(D.zonasDificil.map(z => preferir(z, fuera)));
    sin.forEach(p => { const g = Array.isArray(p) ? p : [p], ciudad = (g.map(id => D.espana[id].ciudad).find(Boolean)) || '';
      shuffle(g.slice()).forEach(id => { if (!quedan || quedan.has(id)) espana.push(Object.assign({ stage: id, mapa: 'espana' }, D.espana[id], todo ? {} : { ciudad })); }); });
    let resto = Object.keys(D.madrid).filter(id => id !== 'zarzuela' && id !== 'moncloa' && STAGES.some(st => st.id === id));
    if (!todo) resto = shuffle(resto.filter(id => hayCasa(id, fuera))).concat(shuffle(resto.filter(id => !hayCasa(id, fuera)))).slice(0, D.madridDificil);
    let cur = D.madrid[resto[Math.floor(Math.random() * resto.length)]]; const madrid = [];
    while (resto.length) { // cada parada, a la más cercana: el camino por Madrid no se cruza a lo loco
      const id = resto.slice().sort((x, y) => Math.hypot(D.madrid[x].x - cur.x, D.madrid[x].y - cur.y) - Math.hypot(D.madrid[y].x - cur.x, D.madrid[y].y - cur.y))[0];
      madrid.push(id); cur = D.madrid[id]; resto = resto.filter(q => q !== id);
    }
    return espana.concat(madrid.concat('zarzuela', 'moncloa').map(id => Object.assign({ stage: id, mapa: 'madrid', lx: 0, ly: 30 }, D.madrid[id])));
  }
  function newRoute(me) {
    const al = S.asel && FIGHTERS[S.asel[0]], fuera = new Set([BASEF(me), al && BASEF(al), BASEF(jefeFinal(me, al))]);
    S.route = RUTA.map(r => { const st = preferir(r.ops.map(o => o.stage), fuera); return Object.assign({ txt: r.txt }, r.ops.find(o => o.stage === st) || r.ops[0]); });
    if (S.dif === 'facil') { S.route = S.route.filter(r => r.stage !== 'meco'); if (S.route.length > 8) S.route = S.route.slice(-8); }
    if (S.dif === 'dificil' || S.dif === 'extra') S.route = rutaDificil(S.dif === 'extra', fuera);
    S.ladder = []; S.allyLadder = []; S.step = 0; S.decretos = []; S.efecto = null; S.pop = 50; S.popLog = []; S.popAnim = null; S.pactos = []; montarRivales(0);
  }
  function startArcadeFight() {
    const C = S.camp, R = S.route, cur = R[S.step];
    if (C) {
      // fin de las primarias: ¡eres el candidato! (y te llevas a alguien de tu partido)
      if (cur.fase === 'campana' && S.step > 0 && R[S.step - 1].fase === 'primarias' && !C.candidato) {
        C.candidato = true; const me = FIGHTERS[S.sel[0]]; S.candUnl = Unlock.next(d => PARTIDO[d.id] && PARTIDO[d.id] === PARTIDO[BASEF(me).id]) || Unlock.next(d => d.bloc === me.bloc) || Unlock.next(); 
        Sound.music('menu'); go('candidato'); return;
      }
      // campaña: tras cada combate eliges entre dos destinos
      if (C.left > 0 && cur.fase === 'madrid' && !S.rumbo) { S.rumbo = opcionesRumbo(); S.rumboSel = 0; if (S.rumbo.length) { Sound.music('menu'); go('rumbo'); return; } C.left = 0; S.rumbo = null; }
      if (cur.especial === 'escandalo' && !cur.hecho && CFG.escandalos !== false) { cur.hecho = true; S.esc = ESCANDALOS[Math.floor(Math.random() * ESCANDALOS.length)]; S.escSel = 0; S.escBonus = 1; go('escandalo'); return; }
      if (cur.especial === 'mitin') { S.efecto = Object.assign(S.efecto || {}, { mitin: true }); if (!cur.popHecho) { cur.popHecho = true; popSuma(6, 'MITIN'); } }
    }
    const me = FIGHTERS[S.sel[0]], opp = S.ladder[S.step], last = S.step === S.ladder.length - 1;
    const fase = cur.fase === 'primarias' ? `PRIMARIAS ${R.filter(r => r.fase === 'primarias').indexOf(cur) + 1}/${R.filter(r => r.fase === 'primarias').length}` : cur.fase === 'campana' ? 'CAMPAÑA: ' + (cur.ciudad || '') : cur.fase === 'madrid' ? 'MADRID' : '';
    S.vs = { a: me, b: opp, al: [FIGHTERS[S.asel[0]], (S.allyLadder || [])[S.step] || null], stage: cur.stage, label: last ? 'COMBATE FINAL' : fase ? fase + ' · COMBATE ' + (S.step + 1) : `COMBATE ${S.step + 1}/${S.ladder.length}` };
    Sound.music('menu'); go('map');
  }
  // ---------- HISTORIA: PRIMARIAS -> CAMPAÑA POR ESPAÑA (eliges destino) -> MADRID -> LA MONCLOA ----------
  // Al ganar la Moncloa se abren los CONFLICTOS INTERNACIONALES (modo propio en el menú) y suena el teléfono rojo como siempre.
  // partido de cada uno, para que las PRIMARIAS sean contra los tuyos (quien no tenga partido aquí, contra su bloque)
  const PARTIDO = {}; Object.entries({
    psoe: 'sanchez zapatero gonzalez robles marlaska puente abalos koldo delgado illa mjmontero bolanos albares patxi rubalcaba',
    pp: 'feijoo ayuso almeida rajoy aznar gamarra barcenas aguirre barbera camps juanma tellado casado cayetana cifuentes vivas imbroda montoro garcia',
    vox: 'abascal espinosa figaredo ortegasmith',
    izq: 'iglesias montero echenique belarra yolanda colau carmena monica bustinduy garzon errejon monedero jigarcia',
    indepe: 'junqueras rufian puigdemont nogueras pujol', cc: 'clavijo oramas',
  }).forEach(([p, l]) => l.split(' ').forEach(id => { PARTIDO[id] = p; }));
  const HIST = { facil: { prim: 2, camp: 3, mad: 1 }, medio: { prim: 3, camp: 4, mad: 2 }, dificil: { prim: 3, camp: 7, mad: 4 }, extra: { prim: 3, camp: 13, mad: 6 } };
  const SEDES = { izquierda: ['ferraz', 'sol', 'ferraz'], derecha: ['genova', 'colon', 'genova'], indepe: ['parlament', 'catalunya', 'arc'] };
  const ESPECIALES = {
    debate: { n: 'DEBATE EN TV', d: 'Debate antes del combate: quien gane, súper lleno', col: '#39d0ff' },
    mitin: { n: 'MITIN', d: 'El público te anima: un 15 % más de vida', col: '#3ddc6a' },
    escandalo: { n: 'ESCÁNDALO', d: 'Te sale un escándalo, pero firmas un decreto más', col: '#ff3b30' },
  };
  function ciudades() { // paradas de España agrupadas por ciudad (Valencia y Barcelona tienen varios escenarios)
    const E = window.RUTA_DIFICIL.espana, L = [];
    Object.keys(E).forEach(id => { if (!STAGES.some(st => st.id === id)) return; if (E[id].ciudad || !L.length) L.push({ n: E[id].ciudad || id.toUpperCase(), ids: [id], x: E[id].x, y: E[id].y }); else L[L.length - 1].ids.push(id); });
    return L;
  }
  function paradaDe(c, especial) { const id = shuffle(c.ids.slice())[0]; return Object.assign({}, window.RUTA_DIFICIL.espana[id], { stage: id, mapa: 'espana', fase: 'campana', ciudad: c.n, especial: especial || null }); }
  function opcionesRumbo() { // las dos ciudades sin visitar más cercanas a donde estás; a veces con parada especial
    const C = S.camp, R = S.route, aqui = R.slice(0, S.step).reverse().find(r => r.fase === 'campana') || { x: 600, y: 360 };
    const libres = C.ciudades.filter(c => !C.visit.includes(c.n)).sort((a, b) => Math.hypot(a.x - aqui.x, a.y - aqui.y) - Math.hypot(b.x - aqui.x, b.y - aqui.y)).slice(0, 2);
    const esp = shuffle(Object.keys(ESPECIALES)); let k = 0;
    return libres.map(c => ({ c, especial: Math.random() < 0.45 ? esp[k++] : null }));
  }
  function elegirRumbo(o) {
    const C = S.camp; C.visit.push(o.c.n); C.left--; S.route.splice(S.step, 0, paradaDe(o.c, o.especial)); S.rumbo = null;
    montarRivales(S.step); startArcadeFight();
  }
  function newHistoria(me) {
    const al = S.asel && FIGHTERS[S.asel[0]], H = HIST[S.dif] || HIST.medio, boss = jefeFinal(me, al), fuera = new Set([BASEF(me), al && BASEF(al), BASEF(boss)].filter(Boolean));
    // PRIMARIAS: gente de tu bloque (si no hay bastante, afines). Salen también los ocultos: así se van conociendo
    const cand = FIGHTERS.filter(d => !d.variantOf && !d.secret && !d.vetado && !d.soloCodigo && META[d.id] && !fuera.has(d));
    const pa = PARTIDO[BASEF(me).id], mio = d => pa && PARTIDO[d.id] === pa;
    let prim = shuffle(cand.filter(mio)).concat(shuffle(cand.filter(d => d.bloc === me.bloc && !mio(d))));
    if (prim.length < H.prim) prim = prim.concat(shuffle(cand.filter(d => d.bloc !== me.bloc && affine(me, d))));
    if (prim.length < H.prim) prim = prim.concat(shuffle(cand.filter(d => !prim.includes(d))));
    prim = prim.slice(0, H.prim);
    const sedes = SEDES[me.bloc] || SEDES.izquierda, M = window.RUTA_DIFICIL.madrid;
    const R = prim.map((d, i) => ({ stage: sedes[i === prim.length - 1 ? 0 : i % sedes.length], fase: 'primarias', rival: d, x: 0, y: 0,
      txt: i === prim.length - 1 ? 'Última votación de las primarias: quien gane será el candidato.' : 'PRIMARIAS: antes que al país, hay que ganarse al partido.' }));
    // CAMPAÑA: se empieza en una ciudad al azar y luego se elige el camino
    const CI = ciudades(), c0 = CI[Math.floor(Math.random() * CI.length)];
    S.camp = { left: Math.min(H.camp, CI.length) - 1, visit: [c0.n], ciudades: CI, candidato: false };
    R.push(paradaDe(c0));
    // MADRID: paradas encadenadas por cercanía; en DIFÍCIL o más, la Zarzuela; y la Moncloa
    let resto = Object.keys(M).filter(id => !['zarzuela', 'moncloa', 'plato'].includes(id) && STAGES.some(st => st.id === id) && !R.some(r => r.stage === id));
    resto = shuffle(resto.filter(id => hayCasa(id, fuera))).concat(shuffle(resto.filter(id => !hayCasa(id, fuera)))).slice(0, H.mad);
    let cur = M[resto[0]] || M.sol; const mad = [];
    while (resto.length) { const id = resto.slice().sort((x, y) => Math.hypot(M[x].x - cur.x, M[x].y - cur.y) - Math.hypot(M[y].x - cur.x, M[y].y - cur.y))[0]; mad.push(id); cur = M[id]; resto = resto.filter(q => q !== id); }
    if (S.dif === 'dificil' || S.dif === 'extra') mad.push('zarzuela');
    mad.push('moncloa');
    mad.forEach(id => R.push(Object.assign({ stage: id, mapa: 'madrid', fase: 'madrid', lx: 0, ly: 30 }, M[id])));
    S.route = R; S.rumbo = null; S.ladder = []; S.allyLadder = []; S.step = 0; S.decretos = []; S.efecto = null; S.pop = 50; S.popLog = []; S.popAnim = null; S.pactos = []; S.historia = { ganados: 0 };
    montarRivales(0);
  }
  // ---------- LABORATORIO: para probar cualquier luchador, escenario, noticia o arma (solo en local o tras el código privado) ----------
  const LAB_OK = () => { if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return true; try { return localStorage.getItem('mf_lab') === '1'; } catch (e) { return false; } };
  const LAB_CPU = [['QUIETA (SACO)', -1], ['FÁCIL', 1], ['NORMAL', 4], ['DIFÍCIL', 7]];
  const LAB_VIDA = [1, 0.5, 0.1];
  const LAB_BOTON = [null, 'rojo', 'verde'];
  const labLista = () => FIGHTERS.filter(f => META[f.id] && META[f.id].punch);
  function labAtajos(M) {
    const [a, b] = M.f, P = c => pressed.has(c);
    if (P('Digit1')) { a.meter = 100; Sound.play('blip'); }
    if (P('Digit2')) { b.hp = Math.min(b.hp, 1); b.lag = b.hp; Sound.play('blip'); }
    if (P('Digit3')) caosBoton(M, a, { color: 'rojo' });
    if (P('Digit4')) caosBoton(M, a, { color: 'verde' });
    if (P('Digit5')) M.items.push({ tipo: 'escudo', x: a.x, t: 20 });
    if (P('Digit6')) { const i = Math.max(0, NOTICIAS.findIndex(n => M.news && n.id === M.news.id)); M.news = NOTICIAS[(i + 1) % NOTICIAS.length]; M.newsT = 0; M.callout(a, M.news.t); }
    if (P('Digit7')) { a.hp = a.maxHp; a.lag = a.hp; b.hp = b.maxHp; b.lag = b.hp; }
    if (APAGON_PRUEBA && (P('Digit8') || P('Digit9'))) { // prueba del apagón: escenario anterior / siguiente sin salir del combate
      const L = S.labCfg, n = STAGES.length; L.st = (L.st + (P('Digit9') ? 1 : n - 1)) % n; M.stage = STAGES[L.st].id;
      M.news = NOTICIAS.find(q => q.id === 'apagon'); M.newsT = 0; M.callout(a, (L.st + 1) + '/' + n + ' ' + STAGES[L.st].name.toUpperCase() + (nocheDe(M.stage) ? '' : ' (SIN NOCHE)')); Sound.play('blip');
    }
  }
  function labEmpieza() {
    const L = S.labCfg, lista = labLista(), a = lista[L.a], b = lista[L.b], st = STAGES[L.st];
    S.mode = 'lab'; S.vs = { a, b, al: L.apoyos ? [null, null] : [null, null], stage: st.id, label: 'LABORATORIO', sinApoyo: !L.apoyos }; Sound.music('menu'); go('vs');
  }
  function labPrepara(M) {
    const L = S.labCfg; M.lab = { vida: LAB_VIDA[L.vida], boton: LAB_BOTON[L.boton], noticia: L.noticia };
    const cpu = LAB_CPU[L.cpu][1]; [M.f[1], M.res[1]].filter(Boolean).forEach(x => { if (cpu < 0) x.saco = true; else x.level = cpu; });
    if (!L.apoyos) { M.f.forEach(f => { f.allyDef = null; }); M.res = [null, null]; }
    caosRonda(M);
  }
  // MODO CAOS: combates sueltos contra rivales nacionales al azar, con el botón rojo y los objetos
  function caosSiguiente() {
    const me = FIGHTERS[S.sel[0]], opp = shuffle(FIGHTERS.filter(d => !d.variantOf && !d.secret && !d.intl && BASEF(d) !== BASEF(me) && Unlock.has(d)))[0] || FIGHTERS.find(d => BASEF(d) !== BASEF(me));
    S.vs = { a: me, b: opp, al: [FIGHTERS[S.asel[0]], null], stage: opp.stage || me.stage, label: 'MODO CAOS' }; go('vs');
  }
  // ---------- MODOS LOCOS: legislatura (supervivencia), moción de censura (tú contra tres) y cumbre internacional ----------
  const intlLibres = () => FIGHTERS.filter(f => f.secret && !f.variantOf && Unlock.has(f) && LISTO(f));
  const CUMBRE_ABIERTA = () => intlLibres().length >= 2;
  const nacionales = me => FIGHTERS.filter(d => !d.variantOf && !d.secret && !d.vetado && META[d.id] && BASEF(d) !== BASEF(me));
  function legSiguiente() {
    const me = FIGHTERS[S.sel[0]], al = FIGHTERS[S.asel[0]], c = nacionales(me).filter(d => !al || BASEF(d) !== BASEF(al)), opp = c[Math.floor(Math.random() * c.length)];
    S.vs = { a: me, b: opp, al: [al, null], stage: STAGES.some(st => st.id === opp.stage) ? opp.stage : 'congreso', label: 'LEGISLATURA · COMBATE ' + (S.legN + 1) }; Sound.music('menu'); go('vs');
  }
  function mocionEmpieza() {
    const me = FIGHTERS[S.sel[0]], todos = nacionales(me), otro = shuffle(todos.filter(d => d.bloc !== me.bloc)), r = otro.length >= 3 ? otro.slice(0, 3) : shuffle(todos).slice(0, 3);
    S.mocCola = r[2]; ensure([r[2].id]);
    S.vs = { a: me, b: r[0], al: [null, r[1]], stage: 'congreso', label: 'MOCIÓN DE CENSURA: TÚ CONTRA TRES' }; Sound.music('menu'); go('vs');
  }
  function cumbreSiguiente() {
    const me = FIGHTERS[S.sel[0]], opp = S.cumbre[S.cumbreN];
    S.vs = { a: me, b: opp, al: [FIGHTERS[S.asel[0]], null], stage: STAGES.some(st => st.id === opp.stage) ? opp.stage : 'exteriores', label: `CUMBRE INTERNACIONAL ${S.cumbreN + 1}/${S.cumbre.length}` }; Sound.music('menu'); go('vs');
  }
  function modoExtra(M) {
    const f = M.f[0], b = M.f[1];
    if (S.mode === 'legislatura') { // a un solo asalto, con la vida que te quedó del anterior
      M.f.forEach(x => { x.wins = 1; }); f.hp = f.maxHp * (S.legHp || 1); f.lag = f.hp;
      [b, M.res[1]].filter(Boolean).forEach(x => { x.level = Math.min(8, 1 + S.legN); });
    }
    if (S.mode === 'mocion') { // tú solo (con más vida y la barra llena) contra tres que entran uno detrás de otro
      M.f.forEach(x => { x.wins = 1; }); f.allyDef = null; M.res[0] = null; f.maxHp = Math.round(f.maxHp * 1.7); f.hp = f.maxHp; f.lag = f.hp; f.meter = 100;
      if (S.mocCola) M.cola = [[], [S.mocCola]];
      [b, M.res[1]].filter(Boolean).forEach(x => { x.level = 4; });
    }
    if (S.mode === 'cumbre') [b, M.res[1]].filter(Boolean).forEach(x => { x.level = Math.min(8, 3 + S.cumbreN); });
    if (S.mode === 'libre' && S.libre) { // la máquina sube de nivel en cada peldaño; el último aguanta más
      [b, M.res[1]].filter(Boolean).forEach(x => { x.level = Math.min(8, 1 + S.libre.n); });
      if (S.libre.n === S.libre.L.length - 1) { b.maxHp = Math.round(b.maxHp * 1.1); b.hp = b.maxHp; b.lag = b.hp; }
    }
    if (S.vs && S.vs.conflicto) { M.f.forEach(x => { x.allyDef = null; }); M.res = [null, null]; b.level = 7; b.maxHp = Math.round(b.maxHp * 1.08); b.hp = b.maxHp; b.lag = b.hp; } // un contra uno, duro pero no imposible
    if (S.mode === 'diario' && S.dia) { // la regla del día
      const R = S.dia.regla.id; [b, M.res[1]].filter(Boolean).forEach(x => { x.level = 5; });
      if (['misiles', 'apagon', 'hacienda'].includes(R)) { M.newsForce = R; M.news = NOTICIAS.find(q => q.id === R); M.newsPrev = R; if (R === 'misiles') M.btnT = 150; }
      if (R === 'asalto') M.f.forEach(x => { x.wins = 1; });
      if (R === 'gigante') { b.maxHp = Math.round(b.maxHp * 1.5); b.hp = b.maxHp; b.lag = b.hp; }
      if (R === 'super') M.f.forEach(x => { x.meter = 100; });
      if (R === 'media') { f.hp = f.maxHp * 0.5; f.lag = f.hp; }
      if (R === 'solos') { M.f.forEach(x => { x.allyDef = null; }); M.res = [null, null]; }
    }
  }
  // ---------- ARCADE NO LINEAL: decretos (mejoras que se acumulan), pactos con el derrotado y escándalos entre combates ----------
  const DECRETOS = [
    { id: 'pegada', n: 'PRESUPUESTOS EXPANSIVOS', d: 'Pegas un 15 % más', ico: '+15%' },
    { id: 'blindaje', n: 'BLINDAJE JURÍDICO', d: 'Un 20 % más de vida', ico: '+20%' },
    { id: 'aforado', n: 'AFORAMIENTO', d: 'Recibes un 12 % menos de daño', ico: '-12%' },
    { id: 'superavit', n: 'SUPERÁVIT', d: 'Empiezas cada asalto con media barra de súper', ico: '1/2' },
    { id: 'apoyo', n: 'GOBIERNO DE COALICIÓN', d: 'Tu apoyo vuelve el doble de rápido', ico: 'X2' },
    { id: 'velocidad', n: 'VÍA RÁPIDA', d: 'Te mueves un 12 % más rápido', ico: '>>' },
    { id: 'dietas', n: 'DIETAS', d: 'Te curas con el 15 % del daño que haces', ico: '+PV' },
    { id: 'confianza', n: 'CUESTIÓN DE CONFIANZA', d: 'Una vez por combate aguantas un K.O.', ico: '1UP' },
    { id: 'boton', n: 'MALETÍN NUCLEAR', d: 'El botón rojo sale más y tus misiles no te tocan', ico: '!' },
  ];
  const ESCANDALOS = [
    { t: 'TE PILLAN UN WHATSAPP COMPROMETIDO', o: [
      { n: 'DIMITIR... DE BROMA', d: 'Empiezas el próximo combate con el 75 % de vida, pero firmas un decreto más', e: { vida: 0.75, extra: 1 } },
      { n: 'NEGARLO TODO', d: 'El próximo rival tiene un 20 % más de vida', e: { rival: 1.2 } }] },
    { t: 'UN JUEZ TE CITA A DECLARAR', o: [
      { n: 'ACATAR', d: 'Pierdes un decreto al azar', e: { quita: 1 } },
      { n: 'RECURRIR', d: 'Los asaltos del próximo combate duran solo 45 segundos', e: { tiempo: 45 } }] },
    { t: 'FILTRAN TU TESIS DOCTORAL', o: [
      { n: 'CULPAR AL BECARIO', d: 'Empiezas el próximo combate con la barra de súper llena', e: { meter: 100 } },
      { n: 'PEDIR PERDÓN', d: 'Firmas un decreto más, pero empiezas con el 85 % de vida', e: { extra: 1, vida: 0.85 } }] },
    { t: 'SE ROMPE EL GOBIERNO DE COALICIÓN', o: [
      { n: 'ADELANTAR ELECCIONES', d: 'El próximo combate, con la crisis de los misiles', e: { noticia: 'misiles' } },
      { n: 'GOBERNAR EN FUNCIONES', d: 'El próximo combate, sin apoyo ni cambios', e: { sinApoyo: true } }] },
    { t: 'TU CUÑADO PIDE UN CARGO', o: [
      { n: 'ENCHUFARLO', d: 'Firmas un decreto más, pero el rival pega un 15 % más', e: { extra: 1, rivalPega: 1.15 } },
      { n: 'DECIR QUE NO', d: 'Se pasa al rival: empieza con la barra de súper llena', e: { rivalMeter: 100 } }] },
    { t: 'TE GRABAN EN UN RESTAURANTE CARO', o: [
      { n: 'PAGAR CON LA TARJETA OPACA', d: 'Firmas un decreto más, pero se va la luz en el próximo combate', e: { extra: 1, noticia: 'apagon' } },
      { n: 'DECIR QUE ERA UNA REUNIÓN', d: 'Hacienda te vigila el próximo combate', e: { noticia: 'hacienda' } }] },
  ];
  const decNombre = id => (DECRETOS.find(d => d.id === id) || {}).n || id;
  // POPULARIDAD (interruptor CFG.popularidad): de 0 a 100, empieza en 50. La mueven victorias, derrotas, escándalos, decretos,
  // pactos, mítines y debates. Alta (75+): RESPALDO POPULAR, +10 % de vida. Baja (25 o menos): ABUCHEOS, el rival pega un 10 % más.
  // Al llegar a la Moncloa decide el tipo de gobierno (gobierno()).
  const POP_DEC = { pegada: 3, blindaje: -3, aforado: -8, superavit: 4, apoyo: 2, velocidad: 0, dietas: -8, confianza: 2, boton: -5 };
  const POP_ESC = { 'DIMITIR... DE BROMA': 4, 'NEGARLO TODO': -8, 'ACATAR': 6, 'RECURRIR': -5, 'CULPAR AL BECARIO': -6, 'PEDIR PERDÓN': 5, 'ADELANTAR ELECCIONES': 3, 'GOBERNAR EN FUNCIONES': -4, 'ENCHUFARLO': -10, 'DECIR QUE NO': 6, 'PAGAR CON LA TARJETA OPACA': -10, 'DECIR QUE ERA UNA REUNIÓN': -3 };
  const POPON = () => CFG.popularidad !== false && S.mode === 'arcade';
  const popVal = () => S.pop == null ? 50 : S.pop;
  const popPacto = f => f && f.bloc === FIGHTERS[S.sel[0]].bloc ? 3 : -10; // pactar con los tuyos gusta; con el otro bloque, tus votantes no lo entienden
  const popTxt = n => POPON() && n ? ` (popularidad ${n > 0 ? '+' : ''}${n})` : '';
  function popSuma(n, motivo) { if (!POPON() || !n) return; S.pop = clamp(popVal() + n, 0, 100); (S.popLog = S.popLog || []).push([n, motivo]); S.popAnim = { n, motivo, t: 0 }; }
  function popBarra(x, y, w) { // barra de píxel con el porcentaje y, si acaba de cambiar, el +N / -N flotando
    if (!POPON()) return; const p = popVal(), col = p >= 75 ? '#3ddc6a' : p <= 25 ? '#ff3b30' : p >= 50 ? '#c6e04a' : '#ffb000', h = 14;
    text('POPULARIDAD ' + Math.round(p) + '%', x, y, 9, '#fff', 'left', '#000');
    pr(x - 3, y + 9, w + 6, h + 6, '#0c0614'); pr(x, y + 12, w, h, '#2a2638'); pr(x, y + 12, Math.round(w * p / 100 / 4) * 4, h, col); pr(x, y + 12, Math.round(w * p / 100 / 4) * 4, 3, 'rgba(255,255,255,0.35)');
    for (let i = 1; i < 4; i++) pr(x + Math.round(w * i / 4), y + 12, 2, h, 'rgba(0,0,0,0.45)');
    const A = S.popAnim; if (A && A.t < 150) { A.t++; const a = Math.min(1, (150 - A.t) / 40); ctx.globalAlpha = a; text((A.n > 0 ? '+' : '') + A.n + ' ' + A.motivo, x + w + 14, y + 19 - Math.min(10, A.t / 4), 9, A.n > 0 ? '#3ddc6a' : '#ff6b5e', 'left', '#000'); ctx.globalAlpha = 1; }
  }
  function gobierno() { // final según la ruta: popularidad y pactos firmados por el camino
    if (CFG.popularidad === false || S.mode !== 'arcade') return null;
    const p = Math.round(popVal()), me = FIGHTERS[S.sel[0]], pac = (S.pactos || []).map(byId).filter(Boolean), cruz = pac.filter(f => f.bloc !== me.bloc), nombres = L => { const n = L.map(f => f.name); return n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1] : n[0]; };
    let t, d;
    if (p >= 80) [t, d] = ['MAYORÍA ABSOLUTA', 'Arrasa en las urnas: gobierna sin pedir permiso a nadie.'];
    else if (cruz.length >= 2) [t, d] = ['GOBIERNO FRANKENSTEIN', 'Lo sostienen ' + nombres(cruz) + '. Nadie sabe muy bien cómo.'];
    else if (p >= 60) [t, d] = ['GOBIERNO EN SOLITARIO', 'Gana con holgura y gobierna con apoyos puntuales.'];
    else if (pac.length) [t, d] = ['GOBIERNO DE COALICIÓN', 'Gobierna de la mano de ' + nombres(pac) + '.'];
    else if (p >= 35) [t, d] = ['GOBIERNO EN MINORÍA', 'Cada votación en el Congreso es una final.'];
    else [t, d] = ['INVESTIDURA POR LOS PELOS', 'Sale investido por un solo voto y con media España en contra.'];
    const L = leer('mf_gobiernos', []); if (!L.includes(t)) { L.push(t); guardar('mf_gobiernos', L); }
    return { t, d, p };
  }
  function tirarDecretos() { // tres cartas que aún no tengas; a veces una es pactar con el que acabas de ganar
    const ya = new Set(S.decretos || []), c = shuffle(DECRETOS.filter(d => !ya.has(d.id))).slice(0, 3);
    const lo = S.ladder[S.step - 1], me = FIGHTERS[S.sel[0]], al = FIGHTERS[S.asel[0]];
    if (lo && !lo.secret && BASEF(lo) !== BASEF(me) && (!al || BASEF(lo) !== BASEF(al)) && META[lo.id] && Math.random() < 0.45) c[c.length - 1] = { id: 'pacto', f: lo, n: 'PACTO CON ' + lo.name, d: 'Será tu apoyo el resto del camino', ico: '' };
    S.cartas = c; S.decSel = 0;
  }
  function trasVictoria() { // entre combate y combate del arcade: a veces un escándalo, siempre un decreto
    S.decExtra = 0;
    if (CFG.decretos === false && CFG.escandalos === false) { startArcadeFight(); return; }
    if (CFG.escandalos !== false && S.step >= 1 && Math.random() < 0.4) { S.esc = ESCANDALOS[Math.floor(Math.random() * ESCANDALOS.length)]; S.escSel = 0; go('escandalo'); }
    else if (CFG.decretos === false) startArcadeFight();
    else { tirarDecretos(); go('decreto'); }
  }
  // ---------- FASE DE BONUS: LIMPIEZA DE DESPACHO (a mitad de HISTORIA, una vez por partida; GAME_CONFIG.bonus: false la quita) ----------
  // Traspaso de poderes: 20 segundos para no dejar ni una carpeta. Se juega con el motor de combate: el rival es un saco invisible
  // que ni ataca ni cae, y la vida que «pierde» es lo que se lleva la pila de muebles (las piezas salen volando de arriba abajo).
  const BONUS_T = 20, BONUS_X = STAGE_W / 2 + 200, BONUS_K = 0.45, BONUS_ESC = 0.8;
  const BONUS_PILA = [['silla', -72, 0], ['papelera', 74, 0], ['maletin', -58, 1], ['carpetas', 66, 1], ['carpetas', -34, 2], ['maceta', 46, 2], ['micro', -4, 3]]; // [objeto, x, fila] de abajo arriba
  const bonusToca = () => CFG.bonus !== false && S.mode === 'arcade' && !S.bonusHecho && !(S.vs && S.vs.reto) && S.ladder.length >= 4 && S.step === Math.floor(S.ladder.length / 2);
  function bonusAnuncia() { S.bonusHecho = true; S.bonusFase = 'intro'; S.bonusRes = null; ensureStage('hacienda'); Sound.music('menu'); go('bonus'); }
  function empiezaBonus() {
    const me = FIGHTERS[S.sel[0]], M = S.match = new Match(me, me, 'hacienda', 'arcade', 0, null, null), b = M.f[1];
    S.vs = { a: me, b: me, al: [null, null], stage: 'hacienda', label: 'FASE DE BONUS' };
    M.f.forEach(f => { f.allyDef = null; }); M.res = [null, null]; M.props = []; b.saco = true; b.cpu = true; b.rasgo = null;
    M.f[0].x = BONUS_X - 420; b.x = BONUS_X; M.camX = clamp(BONUS_X - 210 - W / 2, 0, STAGE_W - W);
    const pila = BONUS_PILA.filter(p => PROPS[p[0]]).map(([n, dx, fila]) => { const m = PROPS[n]; return { n, dx, fila, w: Math.round(m.w * BONUS_ESC), h: Math.round(m.h * BONUS_ESC) }; });
    pila.forEach((p, i) => { // cada pieza se apoya en lo más alto que tenga debajo (si no, flotan)
      p.y = GROUND + 6; for (const q of pila.slice(0, i)) if (Math.abs(q.dx - p.dx) < q.w / 2 - 6) p.y = Math.min(p.y, q.y - q.h + 8);
      p.umbral = 100 * i / pila.length; }); // la de más arriba es la primera en saltar; la última, al llegar a cero
    M.bonus = { hp: 100, golpes: 0, pila, trozos: [], wob: 0 };
    M.time = BONUS_T * 60; M.tiempoAsalto = BONUS_T; M.say('Fase de bonus');
    Sound.music(MUSIC_OF.hacienda || 'hacienda'); go('fight');
  }
  function bonusPaso(M) { // cada fotograma del bonus (después de mover a los luchadores)
    const B = M.bonus, a = M.f[0], b = M.f[1];
    const perdido = Math.max(0, b.maxHp - b.hp); Object.assign(b, { hp: b.maxHp, lag: b.maxHp, rec: b.maxHp, prevHp: b.maxHp, x: BONUS_X, y: GROUND, vx: 0, vy: 0, invul: 0, meter: 0, dir: -1, guard: false });
    if (['down', 'dead', 'getup', 'fall', 'dizzy', 'fatal', 'win'].includes(b.state)) b.set('idle');
    a.hp = a.maxHp; a.lag = a.hp; M.blood = []; M.pools = []; M.teeth = []; M.fx = M.fx.filter(e => e.solo !== 'sangre'); // a los muebles no les sale sangre
    if (perdido > 0 && B.hp > 0 && M.phase === 'fight') {
      B.golpes++; B.hp = Math.max(0, B.hp - perdido / b.maxHp * 100 * BONUS_K); B.wob = 10;
      { const y0 = GROUND - rand(120, 300); folios(M, BONUS_X, y0, 1 + Math.min(2, Math.round(perdido / 3)), a.dir * 6); trizas(M, BONUS_X, y0, 3 + Math.min(6, Math.round(perdido)), a.dir * 6); }
      for (const p of B.pila) if (!p.fuera && B.hp <= p.umbral) { // sale volando, lejos de quien pega
        p.fuera = true; const d = BONUS_X >= a.x ? 1 : -1; Sound.play('heavy'); M.shake = Math.max(M.shake, 10);
        B.trozos.push({ n: p.n, w: p.w, h: p.h, x: BONUS_X + p.dx, y: p.y - p.h / 2, vx: d * rand(8, 16) + rand(-3, 3), vy: rand(-24, -14), rot: 0, vr: d * rand(0.15, 0.4), bote: 0 });
        M.spark(BONUS_X + p.dx, p.y - p.h / 2, '#ffe14a', 12);
      }
    }
    if (B.wob > 0) B.wob--;
    for (const q of B.trozos) { q.vy += 1.1; q.x += q.vx; q.y += q.vy; q.rot += q.vr; if (q.y > GROUND - q.h / 2 && q.vy > 0) { q.roto = true; romper(M, q.n, q.x, GROUND - q.h / 2, q.vx); } } // al caer, se hace pedazos
    B.trozos = B.trozos.filter(q => !q.roto);
    if (M.phase === 'fight') {
      M.time--;
      if (B.hp <= 0 || M.time <= 0) { M.phase = 'bonusfin'; M.pt = 0; B.pct = Math.round(100 - B.hp); M.say(B.hp <= 0 ? '¡Despacho limpio!' : 'Tiempo'); Sound.play(B.hp <= 0 ? 'super' : 'ko'); if (B.hp <= 0) M.flashT = 6; }
    } else if (M.phase === 'bonusfin' && M.pt > 150) M.done = true;
  }
  function bonusPinta(M, cam, capa) { // capa 'pila': lo que queda en pie (detrás de los luchadores); 'aire': lo que vuela (delante)
    const B = M.bonus, Q = 4, R = v => Math.round(v / Q) * Q;
    if (capa === 'pila') {
      const sx = B.wob ? Math.round(Math.sin(B.wob * 1.7) * B.wob * 0.8) : 0; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(BONUS_X - cam, GROUND + 6, 150, 12, 0, 0, 7); ctx.fill();
      for (const p of B.pila) { if (p.fuera) continue; const im = IMG['prop/' + p.n]; if (!im || !im.complete) continue; ctx.drawImage(im, Math.round(BONUS_X + p.dx - cam - p.w / 2 + sx * (1 + p.fila * 0.6)), Math.round(p.y - p.h), p.w, p.h); }
      return;
    }
    for (const q of B.trozos) { const im = IMG['prop/' + q.n]; if (!im || !im.complete) continue; ctx.save(); ctx.translate(Math.round(q.x - cam), Math.round(q.y)); ctx.rotate(q.rot); ctx.drawImage(im, -q.w / 2, -q.h / 2, q.w, q.h); ctx.restore(); }
  }
  function bonusHud(M) {
    const B = M.bonus, a = M.f[0], bw = 520, x = W / 2 + 70, pct = Math.round(100 - B.hp), r = B.hp / 100;
    const fi = IMG[a.id + '/face']; ctx.fillStyle = a.def.color; ctx.fillRect(8, 20, 80, 80); if (fi && fi.naturalWidth) ctx.drawImage(fi, 8, 20, 80, 80); ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.strokeRect(8, 20, 80, 80);
    text(a.def.name, 100, 40, ajusta(a.def.name, 15, 330), '#fff', 'left', '#000'); text('GOLPES: ' + B.golpes, 100, 70, 12, '#ffe14a', 'left', '#000');
    ctx.fillStyle = '#000'; ctx.fillRect(x - 4, 36, bw + 8, 34); ctx.fillStyle = '#2a2638'; ctx.fillRect(x, 40, bw, 26); ctx.fillStyle = r < 0.25 ? '#ff9d2e' : '#c8a46a'; ctx.fillRect(x + Math.round(bw * (1 - r)), 40, Math.round(bw * r), 26); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, 40, bw, 7);
    text('DESPACHO: ' + pct + '% LIMPIO', x + bw, 88, 12, pct >= 100 ? '#3ddc6a' : '#fff', 'right', '#000');
    ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 46, 22, 92, 64); ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = 4; ctx.strokeRect(W / 2 - 46, 22, 92, 64);
    text(String(Math.max(0, Math.ceil(M.time / 60))).padStart(2, '0'), W / 2, 56, 32, M.time < 300 && Math.floor(M.time / 15) % 2 ? '#ff5a3c' : '#fff');
    const mw = 300, mx = 40, full = a.meter >= 100; ctx.fillStyle = '#000'; ctx.fillRect(mx - 3, H - 43, mw + 6, 22); ctx.fillStyle = '#1c2340'; ctx.fillRect(mx, H - 40, mw, 16); ctx.fillStyle = full ? (Math.floor(Date.now() / 120) % 2 ? '#fff' : '#39d0ff') : '#2f7bff'; ctx.fillRect(mx, H - 40, mw * a.meter / 100, 16);
    if (ESTILO !== 'puno') text(full ? '¡SÚPER LISTO!' : 'SÚPER', mx, H - 58, 11, full ? '#ffe14a' : '#cfd6ff', 'left');
  }
  function bonusPremio(pct) { // popularidad según lo limpio que quede; al 100 %, además, el próximo combate empieza con el súper lleno
    const pop = Math.round(pct / 100 * 6) + (pct >= 100 ? 2 : 0); if (pop) popSuma(pop, 'BONUS');
    if (pct >= 100) S.efecto = Object.assign(S.efecto || {}, { meter: 100 });
    return { pct, pop, super: pct >= 100 };
  }
  function aplicaDecretos(M) {
    const D = new Set(S.decretos || []), E = S.efecto || {}; S.efecto = null;
    const yo = [M.f[0], M.res[0]].filter(Boolean), b = M.f[1];
    for (const f of yo) {
      if (D.has('pegada')) f.def = Object.assign({}, f.def, { power: f.def.power * 1.15 });
      if (D.has('velocidad')) f.def = Object.assign({}, f.def, { speed: f.def.speed * 1.12 });
      if (D.has('blindaje')) { f.maxHp = Math.round(f.maxHp * 1.2); f.hp = f.maxHp; f.lag = f.hp; }
      if (D.has('aforado')) f.dDef = 0.88;
      if (D.has('superavit')) { f.meterIni = 50; f.meter = Math.max(f.meter, 50); }
      if (D.has('apoyo')) f.assistMul = 0.5;
      if (D.has('dietas')) f.dVamp = 0.15;
      if (D.has('confianza')) f.dRes = true;
      if (D.has('boton')) f.dBoton = true;
    }
    if (POPON()) { const p = popVal(); M.popTag = null;
      if (p >= 75) { yo.forEach(q => { q.maxHp = Math.round(q.maxHp * 1.1); q.hp = q.maxHp; q.lag = q.hp; }); M.popTag = 'RESPALDO POPULAR'; }
      else if (p <= 25) { b.def = Object.assign({}, b.def, { power: b.def.power * 1.1 }); M.popTag = 'ABUCHEOS'; } }
    const f = M.f[0];
    if (E.mitin) { f.maxHp = Math.round(f.maxHp * 1.15); f.hp = f.maxHp; f.lag = f.hp; }
    if (E.vida) { f.hp = f.maxHp * E.vida; f.lag = f.hp; }
    if (E.meter) f.meter = E.meter;
    if (E.rival) { b.maxHp = Math.round(b.maxHp * E.rival); b.hp = b.maxHp; b.lag = b.hp; }
    if (E.rivalPega) b.def = Object.assign({}, b.def, { power: b.def.power * E.rivalPega });
    if (E.rivalMeter) b.meter = E.rivalMeter;
    if (E.tiempo) { M.tiempoAsalto = E.tiempo; M.time = E.tiempo * 60; }
    if (E.noticia) { M.newsForce = E.noticia; M.news = NOTICIAS.find(n => n.id === E.noticia); M.newsPrev = E.noticia; if (E.noticia === 'misiles') M.btnT = 150; }
    if (E.sinApoyo) { f.allyDef = null; M.res[0] = null; }
  }
  function beginMatch() {
    const v = S.vs, online = S.mode === 'online'; if (online) netStartMatch();
    try { libera([v.a && v.a.id, v.b && v.b.id, v.al && v.al[0] && v.al[0].id, v.al && v.al[1] && v.al[1].id], v.stage); } catch (e) { /* liberar memoria nunca debe impedir el combate */ }
    const rnd = Math.random; if (online) Math.random = NET.rng; // en online también el reparto inicial sale de la semilla común
    try { S.match = new Match(v.a, v.b, v.stage, online ? 'versus' : S.mode, S.mode === 'arcade' ? (S.dif === 'extra' ? 5 + Math.floor(S.step * 5 / (S.ladder.length - 1 || 1)) : S.dif === 'dificil' ? 3 + Math.floor(S.step * 5 / (S.ladder.length - 1 || 1)) : S.dif === 'facil' ? Math.floor(S.step / 3) : S.step + 1) : 0, v.al && v.al[0], v.al && v.al[1]); } finally { Math.random = rnd; }
    if (S.mode === 'arcade' && !v.reto && (S.dif === 'dificil' || S.dif === 'extra')) { const b = S.match.f[1]; b.maxHp = Math.round(b.maxHp * (S.dif === 'extra' ? 1.12 : 1.06)); b.hp = b.maxHp; b.lag = b.hp; } // DIFÍCIL y EXTRADIFÍCIL: la máquina aguanta más
    if (S.mode === 'arcade' && !v.reto && S.dif === 'facil') { const b = S.match.f[1]; b.maxHp = Math.round(b.maxHp * 0.85); b.hp = b.maxHp; b.lag = b.hp; }
    if (v.reto) { // un contra uno y el presidente extranjero al máximo: más vida, más pegada y la IA más afinada
      const M = S.match, b = M.f[1]; M.f.forEach(f => { f.allyDef = null; }); M.res = [null, null];
      b.level = 8; b.maxHp = Math.round(b.maxHp * 1.15); b.hp = b.maxHp; b.lag = b.hp; b.def = Object.assign({}, b.def, { power: b.def.power * 1.08 }); // probado: gana ~79 de 80 a la CPU más fuerte
    }
    if (S.mode === 'arcade' && !v.reto) aplicaDecretos(S.match);
    modoExtra(S.match); if (S.mode === 'lab') labPrepara(S.match);
    Sound.music(MUSIC_OF[v.stage] || v.stage); go('fight');
  }

  // ---------- Online: 1 contra 1 entre dos navegadores (WebRTC) ----------
  // Una sala con código de 4 letras pone en contacto a los dos jugadores (CFG.salaUrl: /api/sala en local, sala.php en la web);
  // luego la partida va directa de navegador a navegador. Cada uno envía solo sus botones y los dos calculan el mismo combate:
  // el combate avanza un fotograma cuando están los botones de ambos (con NET.D fotogramas de margen) y el azar sale de una semilla común.
  const NET = { on: false, role: '', code: '', pc: null, ch: null, st: 'menu', msg: '', D: 4, g: 0, buf: {}, send: 0, sim: 0, chIn: null, rtt: 0, rLast: -1, carry: 0, pingT: 0, fr: 0, rng: null, mine: null, theirs: null, wait: 0, lastRx: 0, desync: false, ack: 0, pAck: 0 }; // ack: hasta qué fotograma me han llegado todos los botones del rival; pAck: lo mismo visto por el rival
  const VERSION = (document.querySelector('script[src*="game.js"]') || { src: '' }).src.split('v=')[1] || '';
  const BITS = ['l', 'r', 'u', 'd', 'punch', 'kick', 'sp1', 'sp2', 'super', 'assist', 'uEdge'];
  const packIn = o => BITS.reduce((k, b, i) => k | (o[b] ? 1 << i : 0), 0), unpackIn = k => { const o = {}; BITS.forEach((b, i) => { o[b] = !!(k & (1 << i)); }); return o; };
  const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const netSend = o => { try { if (NET.ch && NET.ch.readyState === 'open') NET.ch.send(JSON.stringify(o)); } catch (e) { /* canal cerrado */ } };
  // botones y ping van por un canal aparte, desordenado y sin reenvíos: un paquete perdido no frena a los demás (cada paquete repite los 8 últimos fotogramas)
  const netSendIn = o => { try { if (NET.chIn && NET.chIn.readyState === 'open') NET.chIn.send(JSON.stringify(o)); else netSend(o); } catch (e) { /* canal cerrado */ } };
  const netBuf = g => NET.buf[g] || (NET.buf[g] = { local: {}, remote: {}, hash: {} });
  // con todo esto basta en casi todas las redes; si alguna bloquea la conexión directa se avisa en pantalla
  const STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  // servidor de rebote (TURN) para redes que no dejan conexión directa: la sala da una credencial temporal (Cloudflare, caduca en horas)
  // para que no haya ninguna fija y pública en la web; si la sala no tiene, se usa CFG.turn y si tampoco, solo conexión directa
  async function netIce() {
    let extra = CFG.turn ? [].concat(CFG.turn) : [];
    try {
      const ac = new AbortController(), t = setTimeout(() => ac.abort(), 3000);
      const r = await fetch(CFG.salaUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'ice' }), signal: ac.signal }); clearTimeout(t);
      const o = r.ok ? await r.json() : null;
      if (o && Array.isArray(o.iceServers) && o.iceServers.length) extra = o.iceServers.map(x => Object.assign({}, x, { urls: [].concat(x.urls).filter(u => !/:53(\?|$)/.test(u)) })).filter(x => x.urls.length); // el puerto 53 lo bloquean los navegadores
    } catch (e) { /* sin credencial temporal: se sigue con lo que haya */ }
    return { iceServers: STUN.concat(extra) };
  }
  async function iceDone(pc) {
    if (pc.iceGatheringState === 'complete') return;
    await new Promise(r => { const t = setTimeout(r, 4000); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); r(); } }); });
  }
  function netWire(ch) {
    NET.ch = ch;
    ch.onopen = () => { NET.st = 'conectado'; NET.lastRx = performance.now(); netSend({ t: 'hola', v: VERSION }); NET.rtt = 0; clearInterval(NET.pingT); NET.pingT = setInterval(() => netSendIn({ t: 'ping', ts: performance.now() }), 500); Sound.play('ok'); resetPicks(); NET.mine = NET.theirs = null; S.mode = 'online'; Sound.voice('elige'); go('select'); };
    ch.onclose = () => netLost('EL RIVAL SE HA DESCONECTADO');
    ch.onmessage = netRx;
  }
  function netWireIn(ch) { NET.chIn = ch; ch.onmessage = netRx; }
  function netRx(e) {
      let o; try { o = JSON.parse(e.data); } catch (er) { return; } NET.lastRx = performance.now();
      if (o.t === 'in') { const r = netBuf(o.g).remote; [].concat(o.k).forEach((k, i) => { if (o.f - i >= 0 && r[o.f - i] === undefined) r[o.f - i] = k; }); if (o.g === NET.g) { if (o.f > NET.rLast) NET.rLast = o.f; while (r[NET.ack + 1] !== undefined) NET.ack++; if (o.a > NET.pAck) NET.pAck = o.a; } }
      else if (o.t === 'ping') netSendIn({ t: 'pong', ts: o.ts });
      else if (o.t === 'pong') { const r = performance.now() - o.ts; NET.rtt = NET.rtt ? NET.rtt * 0.8 + r * 0.2 : r; }
      else if (o.t === 'h') { const b = netBuf(o.g); if (b.hash[o.f] !== undefined && b.hash[o.f] !== o.h) NET.desync = true; else b.hash['r' + o.f] = o.h; }
      else if (o.t === 'pick') NET.theirs = o;
      else if (o.t === 'go') netGo(o);
      else if (o.t === 'hola' && o.v && VERSION && o.v !== VERSION) NET.msg = 'OJO: TENÉIS VERSIONES DISTINTAS DEL JUEGO (RECARGAD LA PÁGINA)';
      else if (o.t === 'bye') netLost('EL RIVAL HA SALIDO');
  }
  // pruebas: con ?netprueba=1 dos pestañas del mismo navegador se pasan los mensajes por BroadcastChannel en vez de WebRTC
  const NETTEST = /[?&]netprueba=1/.test(location.search);
  function netTestChannel(code) {
    const bc = new BroadcastChannel('mf-' + code), me = Math.random().toString(36).slice(2), ch = { readyState: 'connecting' };
    // &lag=ms y &perdida=0.1 simulan una red mala (retraso con vaivén y paquetes de botones perdidos) para probar el online
    const q = new URLSearchParams(location.search), lag = +q.get('lag') || 0, loss = +q.get('perdida') || 0;
    ch.send = d => { if (loss && /^\{"t":"(in|ping|pong)"/.test(d) && Math.random() < loss) return; if (!lag) bc.postMessage({ me, d }); else setTimeout(() => bc.postMessage({ me, d }), lag / 2 * (0.7 + Math.random() * 0.6)); }; ch.close = () => { ch.readyState = 'closed'; bc.postMessage({ me, bye: 1 }); bc.close(); };
    bc.onmessage = e => { if (e.data.me === me) return; if (e.data.bye) { ch.onclose && ch.onclose(); return; } if (e.data.hi) { if (ch.readyState !== 'open') { ch.readyState = 'open'; bc.postMessage({ me, hi: 1 }); ch.onopen(); } return; } ch.onmessage({ data: e.data.d }); };
    setTimeout(() => bc.postMessage({ me, hi: 1 }), 100); return ch;
  }
  async function netCreate() {
    if (NETTEST) { netClose(); NET.role = 'host'; NET.code = 'TEST'; NET.st = 'esperando'; go('net'); netWire(netTestChannel('TEST')); return; }
    netClose(); NET.role = 'host'; NET.st = 'creando'; NET.msg = ''; go('net');
    try {
      const ice = await netIce(); if (NET.st === 'menu') return; const pc = NET.pc = new RTCPeerConnection(ice); netWire(pc.createDataChannel('mf', { ordered: true })); netWireIn(pc.createDataChannel('mfin', { ordered: false, maxRetransmits: 0 }));
      await pc.setLocalDescription(await pc.createOffer()); await iceDone(pc);
      const r = await fetch(CFG.salaUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'crear', oferta: JSON.stringify(pc.localDescription) }) });
      if (!r.ok) throw new Error('sala'); NET.code = (await r.json()).codigo; NET.st = 'esperando';
      // se pregunta cada 2 s si el rival ya ha respondido
      while (NET.pc === pc && NET.st === 'esperando') {
        await new Promise(res => setTimeout(res, 2000)); if (NET.pc !== pc) return;
        const q = await fetch(CFG.salaUrl + '?c=' + NET.code + '&t=' + Date.now(), { cache: 'no-store' }); if (!q.ok) continue;
        const s = await q.json(); if (s.respuesta) { NET.st = 'conectando'; await pc.setRemoteDescription(JSON.parse(s.respuesta)); netTimeout(pc); }
      }
    } catch (e) { NET.st = 'error'; NET.msg = 'NO SE HA PODIDO CREAR LA SALA'; }
  }
  async function netJoin(code) {
    if (NETTEST) { netClose(); NET.role = 'guest'; NET.code = code; NET.st = 'conectando'; go('net'); netWire(netTestChannel(code)); return; }
    netClose(); NET.role = 'guest'; NET.code = code.toUpperCase(); NET.st = 'conectando'; NET.msg = ''; go('net');
    try {
      const q = await fetch(CFG.salaUrl + '?c=' + NET.code + '&t=' + Date.now(), { cache: 'no-store' });
      if (!q.ok) { NET.st = 'error'; NET.msg = 'ESA SALA NO EXISTE O HA CADUCADO'; return; }
      const s = await q.json(); if (s.respuesta) { NET.st = 'error'; NET.msg = 'ESA SALA YA ESTÁ COMPLETA'; return; }
      const ice = await netIce(); if (NET.st === 'menu') return; const pc = NET.pc = new RTCPeerConnection(ice); pc.ondatachannel = e => (e.channel.label === 'mfin' ? netWireIn : netWire)(e.channel);
      await pc.setRemoteDescription(JSON.parse(s.oferta)); await pc.setLocalDescription(await pc.createAnswer()); await iceDone(pc);
      const r = await fetch(CFG.salaUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'responder', codigo: NET.code, respuesta: JSON.stringify(pc.localDescription) }) });
      if (!r.ok) throw new Error('sala'); netTimeout(pc);
    } catch (e) { NET.st = 'error'; NET.msg = 'NO SE HA PODIDO ENTRAR EN LA SALA'; }
  }
  // si en 15 s no abre el canal, la red de alguno no deja conectar directamente
  function netTimeout(pc) { setTimeout(() => { if (NET.pc === pc && NET.st === 'conectando') { NET.st = 'error'; NET.msg = 'NO HAY CONEXIÓN DIRECTA: PROBAD CON OTRA RED (WIFI O DATOS)'; } }, 15000); }
  function netClose() { netSend({ t: 'bye' }); clearInterval(NET.pingT); try { if (NET.ch) NET.ch.onclose = NET.ch.onmessage = NET.ch.onopen = null; if (NET.chIn) NET.chIn.onmessage = null; if (NET.pc) NET.pc.ondatachannel = null; NET.ch && NET.ch.close(); NET.chIn && NET.chIn.close(); NET.pc && NET.pc.close(); } catch (e) { /* ya cerrado */ } NET.pc = NET.ch = NET.chIn = null; NET.on = false; NET.buf = {}; NET.desync = false; }
  function netLost(why) { if (NET.st === 'menu') return; netClose(); NET.st = 'error'; NET.msg = why; Sound.stopMusic(); Sound.music('menu'); go('net'); }
  // los dos han elegido: el anfitrión decide semilla y escenario y lo manda; los dos empiezan el mismo combate
  function netReady() {
    if (NET.role !== 'host' || !NET.mine || !NET.theirs || NET.go) return;
    const seed = (Math.random() * 4294967296) >>> 0, a = byId(NET.mine.f), b = byId(NET.theirs.f), st = [a.stage, b.stage][seed & 1];
    const D = Math.max(4, Math.min(13, Math.ceil((NET.rtt || 100) / 2 / 16.7) + 3)); // margen según el ping: ida (rtt/2) en fotogramas + 3 de colchón (uno por enviar cada 2 fotogramas)
    const o = { t: 'go', g: NET.g + 1, seed, D, stage: STAGES.some(s => s.id === st) ? st : 'congreso' }; NET.go = true; netSend(o); netGo(o);
  }
  function netGo(o) {
    const host = NET.role === 'host' ? NET.mine : NET.theirs, guest = NET.role === 'host' ? NET.theirs : NET.mine; if (!host || !guest) return;
    NET.g = o.g; NET.seed = o.seed; NET.D = o.D || 4; NET.go = false;
    S.vs = { a: byId(host.f), b: byId(guest.f), al: [byId(host.a), byId(guest.a)], stage: o.stage, label: 'ONLINE  -  SALA ' + NET.code }; go('vs');
  }
  const netLink = () => location.origin + location.pathname + '?sala=' + NET.code;
  function netShare() {
    const url = netLink();
    if (TOUCH && navigator.share) { navigator.share({ title: "Moncloa's Fighter", text: '¡Te reto en Moncloa\'s Fighter! Sala ' + NET.code, url }).catch(() => {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => { NET.copied = 120; }, () => { NET.msg = url; });
  }
  function netTap(x, y) {
    if (NET.st === 'menu') { const i = Math.round((y - 300) / 80); if (i >= 0 && i < 3 && Math.abs(y - 300 - i * 80) < 34) { NET.sel = i; pressed.add('Enter'); } }
    else if (NET.st === 'esperando') netShare();
    else if (NET.st === 'error') pressed.add('Enter');
  }
  function netStartMatch() { // se llama al empezar el combate: búferes nuevos y los primeros NET.D fotogramas vacíos
    const b = netBuf(NET.g); for (let f = 0; f < NET.D; f++) { b.local[f] = 0; b.remote[f] = 0; }
    NET.send = NET.D; NET.sim = 0; NET.wait = 0; NET.rLast = NET.ack = NET.pAck = NET.D - 1; NET.carry = 0; NET.fr = 0; NET.on = true; NET.rng = seeded(NET.seed);
  }
  NET.input = i => { const b = netBuf(NET.g), me = NET.role === 'host' ? 0 : 1; return unpackIn((i === me ? b.local : b.remote)[NET.sim] || 0); };
  // un fotograma de la pantalla de combate en modo online
  function netFight() {
    const M = S.match, b = netBuf(NET.g);
    // si voy por delante del rival (descontado el viaje), me salto un envío de vez en cuando para que los dos vayan al mismo paso y no haya tirones
    NET.fr++; const adv = (NET.send - 1) - NET.rLast - (NET.rtt || 0) / 2 / 16.7, frena = adv > 2 && NET.fr % (adv > 5 ? 2 : 4) === 0;
    // cada paquete lleva mis botones desde el último fotograma que el rival confirma tener completo (como mínimo los 8 últimos, como mucho 48): si se pierden varios seguidos, se vuelven a mandar y nadie se queda esperando un hueco
    const pack = () => { const k = [], hasta = Math.max(NET.send - 48, Math.min(NET.send - 8, NET.pAck + 1), 0); for (let f = NET.send - 1; f >= hasta; f--) k.push(b.local[f]); return k; };
    if (NET.send - NET.sim < NET.D + 8 && !frena) { const k = packIn(readInput(0)) | NET.carry; NET.carry = 0; b.local[NET.send] = k; NET.send++; if (NET.send % 2 === 0) netSendIn({ t: 'in', g: NET.g, f: NET.send - 1, k: pack(), a: NET.ack }); } // los botones salen cada 2 fotogramas (cada paquete lleva los 8 últimos): la mitad de tráfico, sobre todo por el servidor de rebote
    else { NET.carry |= packIn(readInput(0)); if (NET.fr % 3 === 0) netSendIn({ t: 'in', g: NET.g, f: NET.send - 1, k: pack(), a: NET.ack }); } // un botón pulsado mientras espero no se pierde; y reenvío por si se perdió algo
    let n = 0;
    // el fotograma f se juega exactamente D fotogramas después de enviarlo (así el margen absorbe el viaje y el vaivén de la red); si me he quedado atrás, recupero hasta 3 de golpe
    while (n < 3 && NET.sim < NET.send - NET.D && b.local[NET.sim] !== undefined && b.remote[NET.sim] !== undefined && !M.done) {
      const rnd = Math.random; Math.random = NET.rng; try { M.update(); } finally { Math.random = rnd; }
      delete b.local[NET.sim - 60]; delete b.remote[NET.sim - 60]; delete b.hash[NET.sim - 600]; delete b.hash['r' + (NET.sim - 600)]; NET.sim++; n++;
      if (NET.sim % 120 === 0) { // comprobación de que los dos ven lo mismo
        const h = M.f.reduce((a, f) => a + Math.round(f.hp * 10) * 7 + Math.round(f.x) * 13 + Math.round(f.y) * 3, M.round * 1000003);
        if (b.hash['r' + NET.sim] !== undefined && b.hash['r' + NET.sim] !== h) NET.desync = true; b.hash[NET.sim] = h; netSend({ t: 'h', g: NET.g, f: NET.sim, h });
      }
    }
    NET.wait = n ? 0 : NET.wait + 1;
    if (performance.now() - NET.lastRx > 8000) netLost('SE HA PERDIDO LA CONEXIÓN CON EL RIVAL');
  }

  // tiempos (s) ajustados a la locución assets/audio/historia.mp3 (voz «Viciosa»); si se cambia el audio hay que volver a medirlos
  const STORY = [
    [0.1, 'ESPAÑA. UN GOBIERNO EN EL QUE NADIE SE PONE DE ACUERDO... NI EN LO MÁS MÍNIMO.', 1],
    [6.0, 'LOS PLENOS ACABAN A GRITOS. LOS PRESUPUESTOS, EN UN CAJÓN. Y EL PAÍS... ESPERANDO.', 2],
    [13.4, 'HASTA QUE ALGUIEN TUVO UNA IDEA: SI LO QUE QUIEREN ES PELEARSE... QUE SE PELEEN. PERO AQUÍ DENTRO.', 3],
    [20.4, 'QUE SE DEN DE TORTAS EN EL VIDEOJUEGO... Y QUE TRABAJEN DONDE TIENEN QUE TRABAJAR.', 3],
    [25.6, '', 4],
  ];
  // ---------- REPLANTEO (9/11/2026): logros, avisos, conflictos internacionales, arcade libre, reto diario y galería ----------
  const leer = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  // zonas que se pueden tocar en las pantallas nuevas (las apunta el dibujo y las mira el toque)
  const zona = (x, y, w, h, fn) => { (S.zonas || (S.zonas = [])).push({ x, y, w, h, fn }); };
  // retrato con marco; oculta: en silueta negra
  function cara(f, x, y, s, oculta, borde) {
    pr(x - 4, y - 4, s + 8, s + 8, borde || '#0c0614'); pr(x, y, s, s, oculta ? '#262a3c' : f.color);
    const im = IMG[f.id + '/face']; if (im && im.complete && im.naturalWidth) { ctx.save(); if (oculta) ctx.filter = 'brightness(0)'; ctx.drawImage(im, x, y, s, s); ctx.restore(); }
  }
  // avisos que bajan desde arriba (logros y desbloqueos); no salen en mitad de un combate
  function aviso(t, f, col) { (S.avisos || (S.avisos = [])).push({ t, f, col: col || '#ffe14a', life: 250 }); }
  function drawAvisos() {
    const A = S.avisos; if (!A || !A.length || S.screen === 'fight' || S.screen === 'vs') return;
    const a = A[0]; if (a.life === 250) Sound.play('heal'); a.life--; if (a.life <= 0) { A.shift(); return; }
    const k = Math.min(1, (250 - a.life) / 12, a.life / 12), w = 640, h = 74, x = W / 2 - w / 2, y = Math.round(-h - 10 + (h + 22) * k);
    pxCaja(x, y, w, h, 4, a.col); pxCaja(x + 5, y + 5, w - 10, h - 10, 4, '#141022');
    if (a.f) cara(a.f, x + 16, y + 13, 48);
    wrap(a.t, x + (a.f ? 40 : 0) + w / 2, y + h / 2 - (txtAncho(a.t, 12) > w - 110 ? 11 : 0), 12, a.col, w - 110, 22);
  }
  // LOGROS: cada uno regala un personaje oculto
  const LOGROS = [
    { id: 'primarias', n: 'CANDIDATO', d: 'Gana unas primarias en HISTORIA' },
    { id: 'regional', n: 'BARÓN TERRITORIAL', d: 'Gana a un jefe regional en su tierra' },
    { id: 'moncloa', n: 'INQUILINO DE LA MONCLOA', d: 'Termina HISTORIA' },
    { id: 'puno', n: 'A PUÑO LIMPIO', d: 'Termina HISTORIA sin objetos (PUÑO LIMPIO)' },
    { id: 'extra', n: 'SIN PIEDAD', d: 'Termina HISTORIA en EXTRADIFÍCIL' },
    { id: 'conflicto', n: 'DIPLOMACIA A GUANTAZOS', d: 'Gana un conflicto internacional' },
    { id: 'libre', n: 'TODOS CONTRA TI', d: 'Termina el ARCADE LIBRE' },
    { id: 'perfecto', n: 'IMPECABLE', d: 'Gana un asalto sin que te toquen' },
    { id: 'patadas', n: 'SOLO PIERNAS', d: 'Gana un combate sin dar un puñetazo' },
    { id: 'remate', n: 'INCONSTITUCIONAL', d: 'Remata a un rival al ganar' },
    { id: 'turbo', n: 'A TODA PASTILLA', d: 'Gana 5 combates en TURBO' },
    { id: 'legislatura', n: 'LEGISLATURA COMPLETA', d: 'Gana 10 combates seguidos en LEGISLATURA' },
    { id: 'mocion', n: 'MOCIÓN SUPERADA', d: 'Gana la moción de censura' },
    { id: 'diario', n: 'MADRUGADOR', d: 'Supera un reto diario' },
  ];
  const Logros = {
    tiene: id => leer('mf_logros', []).includes(id),
    ganar(id) {
      const L = leer('mf_logros', []), l = LOGROS.find(x => x.id === id); if (!l || L.includes(id)) return;
      L.push(id); guardar('mf_logros', L); aviso('¡LOGRO! ' + l.n, null, '#ffe14a');
      const f = Unlock.next(); if (f) aviso('YA PUEDES JUGAR CON ' + f.name, f, '#3ddc6a');
    },
  };
  // al ganar un combate contra la máquina: los logros que dependen de cómo has ganado
  function logrosCombate() {
    const M = S.match, r = S.result; if (!M || !r || !r.p1won || S.mode === 'online' || S.mode === 'lab') return;
    const yo = M.f[0], el = M.f[1]; if (yo.cpu || !el.cpu) return;
    if ((yo.perfectos || 0) > 0) Logros.ganar('perfecto');
    if (M.remate) Logros.ganar('remate');
    const u = yo.usos || {}; if (!u.punch && !u.airp && (u.kick || 0) >= 5) Logros.ganar('patadas');
    if (VELOCIDAD === 'turbo') { const n = leer('mf_turbo', 0) + 1; guardar('mf_turbo', n); if (n >= 5) Logros.ganar('turbo'); }
    if (S.mode === 'legislatura' && S.legN + 1 >= 10) Logros.ganar('legislatura');
    if (S.mode === 'mocion') Logros.ganar('mocion');
  }
  // CAMPAÑA: si ganas en su tierra a un personaje oculto (un «jefe regional»), te lo llevas
  function jefeRegional() {
    const cur = S.route && S.route[S.step], lo = S.ladder[S.step]; if (!S.camp || !cur || cur.fase !== 'campana' || !lo) return;
    const b = BASEF(lo); const z = zonaDe(cur.stage); if (!b.oculto || Unlock.has(b) || !(b.stage === cur.stage || (z !== 'madrid' && zonaDe(b.stage) === z))) return; // de esa tierra de verdad (lo que no tiene zona cuenta como Madrid)
    Unlock.add(b.id); aviso('¡JEFE REGIONAL DERROTADO! YA PUEDES JUGAR CON ' + b.name, b, '#3ddc6a'); Logros.ganar('regional');
  }
  function finHistoria() { guardar('mf_moncloa', 1); Logros.ganar('moncloa'); if (S.dif === 'extra') Logros.ganar('extra'); if (ESTILO === 'puno') Logros.ganar('puno'); }
  // PRIMARIAS: tablero de la sede del partido con los rivales de la votación
  function drawPrimarias() {
    const R = S.route, k = S.step, me = FIGHTERS[S.sel[0]], cur = R[k], t = S.t, P = R.filter(r => r.fase === 'primarias'), i0 = R.indexOf(P[0]);
    bg(cur.stage, 0.62);
    pr(0, 0, W, 64, 'rgba(10,8,18,0.88)'); text('PRIMARIAS DE TU PARTIDO', W / 2, 24, 22, '#ffe14a'); text('VOTACIÓN ' + (k - i0 + 1) + ' DE ' + P.length, W / 2, 50, 10, '#fff');
    const u = Math.min(1, t / 20); cara(me, 90 - (1 - u) * 300, 190, 210, false, '#ff3b30'); text(me.name, 195 - (1 - u) * 300, 440, 15, '#fff'); text('TÚ', 195 - (1 - u) * 300, 164, 14, '#ff6b5e');
    const n = P.length, s = n > 2 ? 150 : 180, gap = 44, x0 = 820 - (n * s + (n - 1) * gap) / 2;
    P.forEach((r, j) => {
      const i = i0 + j, f = S.ladder[i], x = x0 + j * (s + gap), now = i === k, done = i < k, y = 230 + (now ? Math.round(Math.sin(t * 0.12) * 3) * 2 : 0);
      if (!f) return; cara(f, x, y, s, false, now ? (Math.floor(t / 10) % 2 ? '#ffe14a' : '#fff6b8') : done ? '#3ddc6a' : '#3b4058');
      if (done) { ctx.globalAlpha = 0.55; pr(x, y, s, s, '#0c0614'); ctx.globalAlpha = 1; text('DERROTADO', x + s / 2, y + s / 2, 12, '#3ddc6a'); }
      wrap(f.name, x + s / 2, y + s + 30, 10, now ? '#ffe14a' : '#ddd', s + 30, 20);
      if (now && t > 20) text('VS', x - gap / 2 - (j ? 0 : 60), y + s / 2, 22, '#ffe14a', 'center', '#7a0d0d');
    });
    pr(0, H - 76, W, 76, 'rgba(10,8,18,0.88)'); wrap(cur.txt || '', W / 2, H - 50, 12, '#fff', 1100, 22);
    if (t > 25 && Math.floor(t / 30) % 2) text('ENTER', W - 70, H - 16, 10, '#ffe14a');
  }
  // CONFLICTOS INTERNACIONALES: se abren al llegar a la Moncloa; cada presidente extranjero que ganas, es tuyo
  const CONF_ABIERTO = () => !!leer('mf_moncloa', 0) || FIGHTERS.some(f => f.secret && !f.variantOf && Unlock.has(f));
  const confLista = () => FIGHTERS.filter(f => f.secret && !f.variantOf && LISTO(f) && (!f.soloCodigo || Unlock.has(f))); // los de solo código no salen hasta tenerlos
  function confLucha(b) {
    const me = FIGHTERS[S.sel[0]], stage = STAGES.some(st => st.id === b.stage) ? b.stage : 'exteriores';
    ensure([b.id, me.id]); ensureStage(stage);
    S.vs = { a: me, b, al: [null, null], stage, label: Unlock.has(b) ? 'CONFLICTO INTERNACIONAL · REVANCHA' : 'CONFLICTO INTERNACIONAL', conflicto: true }; Sound.play('ok'); go('vs');
  }
  // ARCADE LIBRE: una escalera de 8 rivales con cualquiera que tengas desbloqueado (también extranjeros)
  function libreEmpieza() {
    const me = FIGHTERS[S.sel[0]], al = FIGHTERS[S.asel[0]], fuera = new Set([BASEF(me), al && BASEF(al)]);
    const c = shuffle(FIGHTERS.filter(d => !d.variantOf && !d.vetado && Unlock.has(d) && LISTO(d) && !fuera.has(d)));
    if (!c.length) { go('mode'); return; }
    ensure(c.slice(0, 8).map(d => d.id)); S.libre = { L: c.slice(0, 8), n: 0 }; Sound.music('menu'); go('escalera');
  }
  function libreVs() {
    const me = FIGHTERS[S.sel[0]], b = S.libre.L[S.libre.n], last = S.libre.n === S.libre.L.length - 1;
    S.vs = { a: me, b, al: [FIGHTERS[S.asel[0]], null], stage: STAGES.some(st => st.id === b.stage) ? b.stage : 'congreso', label: last ? 'ARCADE LIBRE · COMBATE FINAL' : `ARCADE LIBRE · COMBATE ${S.libre.n + 1}/${S.libre.L.length}` }; go('vs');
  }
  // RETO DIARIO: el mismo para todo el mundo cada día (sale de la fecha); gana lo antes posible y comparte tu tiempo
  const REGLAS_DIA = [
    { id: 'misiles', n: 'CRISIS DE LOS MISILES', d: 'Caen misiles durante el combate' },
    { id: 'apagon', n: 'APAGÓN', d: 'Se va la luz en mitad del combate' },
    { id: 'hacienda', n: 'HACIENDA TE VIGILA', d: 'Noticia de última hora: llega Hacienda' },
    { id: 'asalto', n: 'A UN SOLO ASALTO', d: 'Quien gane un asalto, gana el combate' },
    { id: 'gigante', n: 'RIVAL BLINDADO', d: 'El rival tiene un 50 % más de vida' },
    { id: 'super', n: 'BARRAS LLENAS', d: 'Los dos empiezan con el súper cargado' },
    { id: 'media', n: 'A MEDIA VIDA', d: 'Empiezas con la mitad de la vida' },
    { id: 'solos', n: 'SIN APOYOS', d: 'Nadie puede llamar a su aliado' },
  ];
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function diaReto() {
    const f = hoy(); let h = 7; for (const c of f) h = (h * 31 + c.charCodeAt(0)) >>> 0; const rng = seeded(h);
    const ini = (CFG.iniciales || []).map(byId).filter(d => d && !d.vetado && !d.variantOf), pool = ini.length >= 2 ? ini : FIGHTERS.filter(d => !d.variantOf && !d.secret && !d.vetado);
    const a = pool[Math.floor(rng() * pool.length)]; let b = a; for (let i = 0; i < 50 && BASEF(b) === BASEF(a); i++) b = pool[Math.floor(rng() * pool.length)];
    return { fecha: f, a, b, regla: REGLAS_DIA[Math.floor(rng() * REGLAS_DIA.length)], stage: STAGES.some(st => st.id === b.stage) ? b.stage : 'congreso' };
  }
  const diaRecord = () => { const D = leer('mf_diario', {}); return D.fecha === hoy() ? D : { fecha: hoy() }; };
  function compartirDiario() {
    const D = diaRecord(), R = S.dia; if (!D.best || !R) return;
    const t = `MONCLOA'S FIGHTER · Reto diario del ${R.fecha.split('-').reverse().join('/')}: con ${R.a.name} contra ${R.b.name} (${R.regla.n}) en ${D.best} segundos. ¿Lo mejoras? https://gastonbruno.es/moncloas-fighter/`;
    try { if (navigator.share) { navigator.share({ text: t }).catch(() => { }); return; } } catch (e) { /* sin compartir */ }
    try { navigator.clipboard.writeText(t).then(() => { S.toast = 'COPIADO: PÉGALO DONDE QUIERAS'; S.toastT = 180; }, () => { S.toast = 'NO SE HA PODIDO COPIAR'; S.toastT = 180; }); } catch (e) { S.toast = 'NO SE HA PODIDO COPIAR'; S.toastT = 180; }
  }
  function diaEmpieza() {
    const R = S.dia; S.mode = 'diario'; S.sel[0] = FIGHTERS.indexOf(R.a); S.asel[0] = FIGHTERS.indexOf(cpuAlly(R.a, R.b) || R.a);
    ensure([R.a.id, R.b.id]); ensureStage(R.stage); S.diaT = 0;
    S.vs = { a: R.a, b: R.b, al: R.regla.id === 'solos' ? [null, null] : [null, null], stage: R.stage, label: 'RETO DIARIO · ' + R.regla.n }; Sound.play('ok'); go('vs');
  }
  // cómo se consigue un personaje bloqueado (selección y galería)
  function pista(f) {
    if (f.vetado) return 'Este personaje no está disponible.';
    if (f.soloCodigo) return 'Solo se consigue con un código secreto.';
    if (f.secret) return 'Gánale en los CONFLICTOS INTERNACIONALES (se abren al llegar a la Moncloa en HISTORIA).';
    if (f.oculto) return 'Personaje oculto: gánale en su tierra durante la campaña de HISTORIA, gana unas primarias o consigue logros.';
    return 'Termina HISTORIA para desbloquear personajes, o introduce un código secreto desde el menú.';
  }
  // iconos de píxel de los decretos (16x16) y el color de su tarjeta. o contorno, w/l/s blanco-gris, y/Y oro, r/R rojo, b/B cuero,
  // k/K gris oscuro, g/G verde, n/N piel, p brillo rojo; c y d: color de la tarjeta y su tono oscuro
  const ICO_DEC = {
    pegada: ["#e8892c", "................", "......oooo......", ".....obbbBo.....", "......obBo......", ".....oyyyYo.....", "....oobbbbBoo...", "...obwbbbbbbBo..", "..obwbbbYYYbbBo.", "..obbbbYbbbbbBo.", ".obbbbYYYYbbbbBo", ".obbbbbYbbbbbbBo", ".obbbbYYYYbbbbBo", ".obbbbbbYYYbbbBo", "..oBbbbbbbbbbBo.", "...oBBBBBBBBBo..", "....ooooooooo..."],
    blindaje: ["#1f8f8a", "................", "..oooo....oooo..", ".orrrRo..orrrRo.", "orwwrrRooorrrrRo", "orwrrrrrrrrrrrRo", "orwrrrrrrrrrrrRo", "orrrrrrrrrrrrrRo", ".orrrrrrrrrrrRo.", ".oRrrrrrrrrrrRo.", "..oRrrrrrrrrRo..", "...oRrrrrrrRo...", "....oRrrrrRo....", ".....oRrrRo.....", "......oRRo......", ".......oo.......", "................"],
    aforado: ["#2a7fd8", "................", ".oooooooooooooo.", ".owwwwwwwwwwwso.", ".owlllllllllsso.", ".owllllyllllsso.", ".owlllyyylllsso.", ".owlyyyyyyylsso.", ".owllyyyyyllsso.", ".owllyylyyllsso.", ".owlllllllllsso.", "..owllllllllso..", "..owlllllllsso..", "...owllllllso...", "....owllllso....", ".....owllso.....", "......oooo......"],
    superavit: ["#d6a400", "................", "........ooooo...", ".......oyyyyo...", "......oyyyyo....", ".....oyyyyo.....", "....oyyyyo......", "...oyyyyyoooo...", "..oyyyyyyyyyo...", "..ooooyyyyyo....", ".....oyyyyo.....", "....oyyyyo......", "....oyyyo.......", "...oyyyo........", "...oyyo.........", "...oyo..........", "...oo..........."],
    apoyo: ["#14904a", "................", "....ooo.........", "...onnno..ooo...", "..onwnnNoonnno..", "..onnnnNonwnnNo.", "..onnnnNonnnnNo.", "...oNNNo.oNNNo..", "..ooooooooooooo.", ".oggggGowwwwwlso", ".oggggGowwwwwlso", "ogggggGowwwwwlso", "ogggggGowwwwwlso", "ogggggGowwwwwlso", "oooooooooooooooo", "................", "................"],
    velocidad: ["#00a2c7", "................", "..oo......oo....", "..owo.....owo...", "..owwo....owwo..", "...owwo....owwo.", "ww..owwo....owwo", "....owwlo...owwl", "ww...owwlo...owl", "....owwlo...owwl", "ww..owwo....owwo", "...owwo....owwo.", "..owwo....owwo..", "..owo.....owo...", "..oo......oo....", "................", "................"],
    dietas: ["#3f9b2e", "................", "..o.o.o.....oo..", "..owowo....owlo.", "..owowo....owlo.", "..owowo....owlso", "..owwwo....owlso", "..owwwo....owlso", "...owo.....owlso", "...owo.....owsso", "...owo......olo.", "...owo......olo.", "...owo......olo.", "...owo......olo.", "...owo......olo.", "...oso......oso.", "....o........o.."],
    confianza: ["#7b3fc4", "................", "......oooo......", "......owlo......", "......owlo......", "......owlo......", ".ooooooKKoooooo.", ".owwwwwwwwwwwlo.", ".owllllllllllso.", ".owllllllllllso.", ".owllccccccllso.", ".owllccccccllso.", ".owllllllllllso.", ".owllllllllllso.", ".osssssssssssso.", ".oooooooooooooo.", "................"],
    boton: ["#d0111f", "................", "......ooo.......", ".....orrRo......", "....orpprRo.....", "....orrrrRo.....", "..ooooooooooo...", "..oKKoooooKKo...", ".okkkkkkkkkkko..", ".okkkkkkkkkkKo..", ".ooooooyyoooooo.", ".okkkkkoYokkkKo.", ".okkkkkkkkkkKo..", ".okkkkkkkkkkKo..", ".oKKKKKKKKKKKo..", "..ooooooooooo...", "................"],
    escandalo: ["#d0111f", "................", ".......oo.......", "......oyyo......", "......oyyo......", ".....oyyyyo.....", ".....oyooyo.....", "....oyyooyyo....", "....oyyooyyo....", "...oyyyooyyyo...", "...oyyyooyyyo...", "..oyyyyyyyyyyo..", "..oyyyyooyyyyo..", ".oyyyyyooyyyyyo.", ".oyyyyyyyyyyyyYo", "oYYYYYYYYYYYYYYo", "oooooooooooooooo"],
  };
  const ICO_PAL = { o: '#0c0614', w: '#ffffff', l: '#dcd6ea', s: '#9a90b4', y: '#ffe14a', Y: '#c9961a', r: '#e5242e', R: '#8f0f19', b: '#d9a45a', B: '#9c6328', k: '#4a4560', K: '#2a2638', g: '#3ddc6a', G: '#178a3c', n: '#f2c9a0', N: '#c98d62', p: '#ff8a8a' };
  const tono = (c, k) => { const A = rRgb(c), B = k < 0 ? [0, 0, 0] : [255, 255, 255], m = rMix(A, B, Math.abs(k)); return `rgb(${m[0]},${m[1]},${m[2]})`; };
  function iconoDec(id, cx, cy, q) {
    const im = IMG['carta/' + id]; if (im && im.complete && im.naturalWidth) { // ilustración de Magnific, a su tamaño de píxel (escala entera si cabe)
      const k = Math.max(1, Math.floor(16 * q * 1.15 / Math.max(im.naturalWidth, im.naturalHeight) * 2) / 2), w = im.naturalWidth * k, h = im.naturalHeight * k, was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
      const f0 = ctx.filter; ctx.globalAlpha = 0.35; ctx.filter = 'brightness(0)'; ctx.drawImage(im, Math.round(cx - w / 2 + q), Math.round(cy - h / 2 + q), w, h); ctx.filter = f0; ctx.globalAlpha = 1;
      ctx.drawImage(im, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h); ctx.imageSmoothingEnabled = was; return; }
    const I = ICO_DEC[id]; if (!I) return; const x0 = Math.round(cx - 8 * q), y0 = Math.round(cy - 8 * q), pal = Object.assign({ c: I[0], d: tono(I[0], -0.4) }, ICO_PAL);
    ctx.fillStyle = 'rgba(12,6,20,0.35)'; for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) if (I[r + 1][c] !== '.') ctx.fillRect(x0 + c * q + q, y0 + r * q + q, q, q); // sombra
    for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) { const k = I[r + 1][c]; if (pal[k]) { ctx.fillStyle = pal[k]; ctx.fillRect(x0 + c * q, y0 + r * q, q, q); } }
  }
  // lo que hace cada decreto, en corto, para la chapa de la tarjeta
  const CHAPA = { pegada: '+15% GOLPE', blindaje: '+20% VIDA', aforado: '-12% DAÑO', superavit: '1/2 SÚPER', apoyo: 'APOYO X2', velocidad: '+12% RAPIDEZ', dietas: 'CURA 15%', confianza: '1 VIDA EXTRA', boton: 'MÁS MISILES' };
  // carta coleccionable genérica: o = { x, y, cw, ch, col, cab, arte(cx, cy), chapa, titulo, desc, pie, sello, on, off, marco }
  function cartaBase(o) {
    const { x, y, cw, ch, on, off } = o, col = off ? '#4a4560' : o.col, osc = tono(col, -0.45), papel = off ? '#bdb6a6' : '#f1e3b4', estrecha = cw < 300;
    pxCaja(x + 8, y + 12, cw, ch, 4, 'rgba(0,0,0,0.5)');
    pxCaja(x, y, cw, ch, 4, on ? (Math.floor(S.t / 10) % 2 ? (o.marco || '#ffe14a') : '#fff6b8') : '#3a3550'); pxCaja(x + 6, y + 6, cw - 12, ch - 12, 4, '#0c0614'); pxCaja(x + 10, y + 10, cw - 20, ch - 20, 4, papel);
    ctx.fillStyle = off ? '#aaa394' : '#e8d6a0'; for (let yy = y + 14; yy < y + ch - 14; yy += 8) for (let xx = x + 14 + ((yy - y) / 8 % 2) * 4; xx < x + cw - 14; xx += 8) ctx.fillRect(xx, yy, 2, 2); // grano del papel
    ctx.fillStyle = '#c9b57e'; for (const [ex, ey, sx, sy] of [[x + 18, y + 18, 1, 1], [x + cw - 18, y + 18, -1, 1], [x + 18, y + ch - 18, 1, -1], [x + cw - 18, y + ch - 18, -1, -1]]) { ctx.fillRect(sx > 0 ? ex : ex - 18, sy > 0 ? ey : ey - 3, 18, 3); ctx.fillRect(sx > 0 ? ex : ex - 3, sy > 0 ? ey : ey - 18, 3, 18); } // esquinas
    pr(x + 24, y + 24, cw - 48, 30, col); pr(x + 24, y + 50, cw - 48, 4, osc); pr(x + 24, y + 24, cw - 48, 3, tono(col, 0.3));
    text(o.cab, x + cw / 2, y + 38, estrecha ? 9 : 10, '#fff', 'center', osc);
    // ventana de la ilustración con rayos que giran en la carta elegida
    const ax = x + 30, ay = y + 66, aw = cw - 60, ah = estrecha ? 124 : 148, cx = ax + aw / 2, cy = ay + ah / 2;
    pxCaja(ax - 4, ay - 4, aw + 8, ah + 8, 4, '#0c0614');
    ctx.save(); ctx.beginPath(); ctx.rect(ax, ay, aw, ah); ctx.clip(); ctx.fillStyle = osc; ctx.fillRect(ax, ay, aw, ah);
    const gir = (on ? S.t : 0) * 0.004; ctx.fillStyle = col;
    for (let i = 0; i < 12; i++) { const a0 = gir + i * Math.PI / 6, a1 = a0 + Math.PI / 12; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * 300, cy + Math.sin(a0) * 300); ctx.lineTo(cx + Math.cos(a1) * 300, cy + Math.sin(a1) * 300); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(ax, ay, aw, 6); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(ax, ay + ah - 10, aw, 10);
    if (off) ctx.filter = 'grayscale(1) brightness(0.35)'; o.arte(cx, cy - 4, ah); ctx.filter = 'none';
    if (off) text('?', cx, cy, 22, '#fff', 'center', '#0c0614');
    ctx.restore();
    if (o.chapa) { const cz = ajusta(o.chapa, 10, aw - 28), tw = Math.min(aw + 8, Math.max(100, txtAncho(o.chapa, cz) + 32)), ty = ay + ah + 4;
      pxCaja(cx - tw / 2, ty - 16, tw, 32, 4, '#0c0614'); pxCaja(cx - tw / 2 + 4, ty - 12, tw - 8, 24, 4, on ? '#ffe14a' : '#fff6b8'); text(o.chapa, cx, ty, cz, '#1a1420', 'center', on ? '#ffe14a' : '#fff6b8'); }
    // título, adorno y descripción, siempre a la misma altura
    const ts = estrecha ? 12 : 14, tl = wrapLines(o.titulo, ts, cw - 50), yt = ay + ah + 52; tl.forEach((l, i) => text(l, cx, yt - (tl.length - 1) * 12 + i * 24, ts, '#1a1420', 'center', papel));
    const yd = ay + ah + 86;
    if (o.pop != null && !off) { // la popularidad va en el adorno, con su color, y no dentro de la descripción
      const pt = 'POPULARIDAD ' + (o.pop > 0 ? '+' : o.pop < 0 ? '' : '±') + o.pop, pw = txtAncho(pt, 9) + 20, lw = Math.max(10, (cw - 96 - pw) / 2);
      pr(x + 48, yd, lw, 2, '#c9b57e'); pr(x + cw - 48 - lw, yd, lw, 2, '#c9b57e'); text(pt, cx, yd + 1, 9, o.pop > 0 ? '#178a3c' : o.pop < 0 ? '#b0121f' : '#8a7a50', 'center', papel);
    } else { const lw = (cw - 120) / 2; pr(x + 48, yd, lw, 2, '#c9b57e'); pr(x + cw - 48 - lw, yd, lw, 2, '#c9b57e'); pr(cx - 10, yd - 3, 6, 8, col); pr(cx + 4, yd - 3, 6, 8, col); pr(cx - 3, yd - 6, 6, 14, osc); }
    const dl = wrapLines(o.desc.replace(/ %/g, '%'), 10, cw - 50), conPie = o.pie && (dl.length < 3 || tam(10) <= 10), fondo = y + ch - (conPie ? 46 : 28), hueco = fondo - (yd + 16); // la descripción nunca baja hasta el pie: si no cabe, el «Nº» se quita
    const lh = Math.min(20, Math.max(tam(10) + 3, hueco / Math.max(1, dl.length))), y1 = Math.max(yd + 16 + lh / 2, (yd + 16 + fondo) / 2 - (dl.length - 1) * lh / 2) - (dl.length > 2 ? 0 : 0);
    dl.forEach((l, i) => text(l, cx, y1 + i * lh, 10, '#4a3726', 'center', papel));
    if (conPie) text(o.pie, x + 40, y + ch - 32, 8, '#a8925a', 'left', papel);
    if (on && o.sello) { ctx.save(); ctx.translate(x + cw - 96, y + ch - 36); ctx.rotate(-0.12); ctx.globalAlpha = 0.9; ctx.strokeStyle = '#d0111f'; ctx.lineWidth = 4; ctx.strokeRect(-58, -17, 116, 34); ctx.lineWidth = 2; ctx.strokeRect(-52, -11, 104, 22); text(o.sello, 0, 1, 12, '#d0111f', 'center', papel); ctx.restore(); }
    if (!on) pxCaja(x, y, cw, ch, 4, 'rgba(12,6,20,0.3)');
  }
  function cartaDecreto(c, x, y, on, num) {
    const pac = c.id === 'pacto';
    cartaBase({ x, y, cw: 340, ch: 424, on, col: pac ? '#14904a' : (ICO_DEC[c.id] || ['#7a0d0d'])[0], marco: pac ? '#3ddc6a' : '#ffe14a', cab: pac ? 'PACTO DE GOBIERNO' : 'BOE · DECRETO LEY',
      arte: (cx, cy) => { if (pac) { const im = IMG[c.f.id + '/face']; if (im && im.complete && im.naturalWidth) { pr(cx - 64, cy - 62, 128, 128, '#0c0614'); ctx.drawImage(im, cx - 60, cy - 58, 120, 120); } } else iconoDec(c.id, cx, cy, 6); },
      chapa: pac ? 'ALIADO' : CHAPA[c.id] || '', titulo: c.n, desc: c.d, pop: POPON() ? (pac ? popPacto(c.f) : POP_DEC[c.id]) || 0 : null, pie: num ? 'Nº ' + num + ' / ' + DECRETOS.length : '', sello: pac ? 'PACTADO' : 'FIRMADO' });
  }
  // iconos de píxel para las tarjetas de los modos locos
  function icono(id, cx, cy, on) {
    const q = 6, P = (x, y, w, h, c) => pr(cx + x * q, cy + y * q, w * q, h * q, c);
    if (id === 'legislatura') { for (let i = 0; i < 5; i++) P(-9 + i * 4, 4 - i * 2, 3, 2 + i * 2, i === 4 ? '#ffe14a' : '#3ddc6a'); P(-10, 6, 21, 1, '#fff'); }
    else if (id === 'mocion') { P(-11, -2, 5, 5, '#ff3b30'); [-2, 3, 8].forEach(x => P(x, -2, 4, 4, '#39a8ff')); P(-5, -1, 2, 2, '#fff'); }
    else if (id === 'cumbre') { P(-5, -6, 10, 12, '#123a86'); P(-6, -5, 12, 10, '#123a86'); P(-3, -4, 4, 3, '#3ddc6a'); P(1, 0, 3, 4, '#3ddc6a'); P(-5, 1, 3, 2, '#3ddc6a'); P(-6, -1, 12, 1, '#9fd0ff'); }
    else if (id === 'caos') { P(-6, 2, 12, 4, '#3a3550'); P(-5, -3, 10, 6, '#b00f2c'); P(-4, -4, 8, 6, Math.floor(S.t / 12) % 2 && on ? '#ff5a5a' : '#e30613'); P(-3, -3, 2, 1, '#fff'); }
    else if (id === 'lab') { P(-2, -7, 4, 5, '#9fd0ff'); P(-5, -2, 10, 7, '#9fd0ff'); P(-4, 0, 8, 4, '#3ddc6a'); P(-1, 1, 1, 1, '#fff'); P(-3, -8, 6, 1, '#fff'); }
  }
  // menú principal: 5 entradas; MÁS MODOS, MULTIJUGADOR y EXTRAS abren submenú. [id, texto, color, descripción]
  const GRUPOS = { solo: 'MÁS MODOS', multi: 'MULTIJUGADOR', extras: 'EXTRAS' };
  const MODOS = () => {
    const g = S.modeGrupo;
    if (g === 'solo') return [
      ['libre', 'ARCADE LIBRE', '#9aa', 'Todos contra todos, sin historia: escalera de rivales'],
      ['conflictos', 'CONFLICTOS INTERNACIONALES', CONF_ABIERTO() ? '#ff6b5e' : '#555', CONF_ABIERTO() ? 'Duelos contra líderes extranjeros' : 'Se abre al llegar a la Moncloa en HISTORIA'],
      ['locos', '¡MODOS LOCOS!', '#3ddc6a', 'Legislatura, moción de censura, cumbre, caos y laboratorio'],
      ['training', 'ENTRENAMIENTO', '#9aa', 'Practica golpes y súper sin rival que te pegue'],
      ['volver', 'VOLVER', '#9aa', '']];
    if (g === 'multi') return [
      ['versus', TOUCH ? 'VERSUS: SOLO EN ORDENADOR' : 'VERSUS: 2 JUGADORES', TOUCH ? '#555' : '#9aa', 'Dos jugadores en el mismo teclado o con mandos'],
      ['online', 'ONLINE: RETA A UN AMIGO', '#3ddc6a', 'Crea una sala y pásale el código'],
      ['volver', 'VOLVER', '#9aa', '']];
    if (g === 'extras') return [
      ['galeria', 'GALERÍA Y LOGROS', '#9aa', 'Personajes, finales y logros conseguidos'],
      ['stats', 'ESTADÍSTICAS', '#9aa', 'Quién gana más en todo el país'],
      ['code', 'CÓDIGO SECRETO', '#9aa', 'Desbloquea personajes con un código'],
      ['controls', 'CONTROLES', '#9aa', 'Teclas, mandos y pantalla táctil'],
      ['intro', 'VER LA INTRO', '#9aa', ''],
      ['volver', 'VOLVER', '#9aa', '']];
    return [
      ['historia', 'HISTORIA', '#ffe14a', 'Camino a la Moncloa: primarias, campaña por toda España y asalto final en Madrid'],
      ['diario', 'RETO DIARIO', '#39d0ff', 'Un combate nuevo cada día con una regla loca'],
      ['g:solo', 'MÁS MODOS', '#ff9a3c', 'Arcade libre, conflictos internacionales, modos locos y entrenamiento'],
      ['g:multi', 'MULTIJUGADOR', '#3ddc6a', 'Versus en el mismo ordenador u online con un amigo'],
      ['g:extras', 'EXTRAS', '#9aa', 'Galería, logros, estadísticas, códigos secretos, controles y la intro']];
  };
  const SCREENS = {
    loading: {
      update() { if (loaded >= toLoad && S.t > 20) { go('title'); } },
      draw() { ctx.fillStyle = '#0b0b16'; ctx.fillRect(-OX, 0, VW, H); text('CARGANDO...', W / 2, 330, 22); ctx.fillStyle = '#333'; ctx.fillRect(340, 380, 600, 22); ctx.fillStyle = '#ffe14a'; ctx.fillRect(340, 380, 600 * loaded / Math.max(1, toLoad), 22); },
    },
    title: {
      update(m) { if (m.ok && FINAL_PRUEBA && S.mode === 'arcade' && !S.finalVisto) { S.finalVisto = true; S.seenStory = true; Sound.play('ok'); resetPicks(); Sound.music('menu'); go('select'); return; }
        if (m.ok && APAGON_PRUEBA && !S.apagonVisto) { S.apagonVisto = true; Sound.play('ok'); S.labCfg = { a: 0, b: 1, cpu: 0, st: 0, noticia: 'apagon', boton: 0, vida: 0, apoyos: false }; labEmpieza(); return; }
        if (m.ok && RETO_PRUEBA) { const id = RETO_PRUEBA; RETO_PRUEBA = ''; Sound.play('ok'); S.mode = 'arcade'; S.sel[0] = FIGHTERS.findIndex(f => f.id === 'sanchez'); startReto(id === '1' ? '' : id); return; }
        if (m.ok && SALA) { Sound.play('ok'); Sound.music('menu'); S.seenStory = true; const c = SALA; SALA = ''; history.replaceState(null, '', location.pathname); netJoin(c); return; }
        if (m.ok) { Sound.play('ok'); if (S.seenStory) { Sound.voice('titulo'); Sound.music('menu'); go('mode'); } else { S.seenStory = true; Sound.narrate('historia'); go('story'); } } },
      draw() {
        // portada: ilustración de todos a gritos (pixel art) con el logo en el hueco central
        const pt = IMG['ui/portada'];
        if (pt && pt.complete && pt.naturalWidth) { ctx.imageSmoothingEnabled = false; const h = W * pt.naturalHeight / pt.naturalWidth; ctx.drawImage(pt, 0, (H - h) / 2, W, h); }
        else bg('moncloa', 0.45);
        const lg = IMG['ui/logo'], p = 1 + Math.sin(S.t * 0.05) * 0.015;
        if (lg && lg.complete && lg.naturalWidth) { const lw = 430 * p, lh = lw * lg.naturalHeight / lg.naturalWidth; titleFX(lg, W / 2 - lw / 2, 340 - lh / 2, lw, lh); }
        else { text("MONCLOA'S", W / 2, 300, 60, '#ffe14a', 'center', '#7a0d0d'); text('FIGHTER', W / 2, 380, 70, '#ff3b30', 'center', '#3a0606'); }
        if (Math.floor(S.t / 30) % 2) text(SALA ? 'PULSA ENTER PARA ENTRAR EN LA SALA ' + SALA : 'PULSA ENTER', W / 2, 540, 20, '#fff');
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 692, W, 28);
        text('Parodia satírica con caricaturas. Ninguna violencia de este juego es real ni deseable. Cualquier parecido con la realidad es pura coincidencia electoral.', W / 2, 706, 8, '#ddd');
      },
    },
    story: {
      update(m) { if ((m.ok && S.t > 30) || m.back || S.t > 60 * 32) { Sound.stopNarration(); Sound.voice('titulo'); Sound.music('menu'); go('mode'); } },
      draw() {
        const sec = S.t / 60; let k = 0; for (let i = 0; i < STORY.length; i++) if (sec >= STORY[i][0]) k = i;
        const [t0, line, panel] = STORY[k], lt = Math.max(0, sec - t0); // sin negativos: con opacidad negativa el navegador pintaba la viñeta entera un instante
        ctx.fillStyle = '#000'; ctx.fillRect(-OX, 0, VW, H);
        const show = (n, al, tt) => { const im = IMG['ui/intro' + n]; if (!im || !im.complete || !im.naturalWidth) return; const z = 1.03 + tt * 0.012, w = W * z, h = w * im.naturalHeight / im.naturalWidth; ctx.globalAlpha = al; ctx.drawImage(im, (W - w) / 2 - tt * 4, (H - h) / 2, w, h);
          // las capas de animación se funden entre sí, sin cortes: base > b > c > b
          const SEQ = ['', 'b', 'c', 'b'], ph = S.t / 22, i0 = Math.floor(ph) % 4, mx = ph - Math.floor(ph), lay = q => { const L = SEQ[q] && IMG['ui/intro' + n + SEQ[q]]; return L && L.complete && L.naturalWidth ? L : null; };
          const LA = lay(i0), LB = lay((i0 + 1) % 4), x0 = (W - w) / 2 - tt * 4, y0 = (H - h) / 2;
          if (LA) { ctx.globalAlpha = al * (LB ? 1 : 1 - mx); ctx.drawImage(LA, x0, y0, w, h); }
          if (LB) { ctx.globalAlpha = al * mx; ctx.drawImage(LB, x0, y0, w, h); }
          ctx.globalAlpha = 1; };
        if (k > 0 && lt < 0.6 && STORY[k - 1][2] !== panel) show(STORY[k - 1][2], 1, sec - STORY[k - 1][0]);
        show(panel, Math.min(1, lt / 0.6), lt);
        const g = ctx.createLinearGradient(0, 380, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(0,0,0,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0.95)'); ctx.fillStyle = g; ctx.fillRect(0, 380, W, H - 380);
        if (k === STORY.length - 1) { const lg = IMG['ui/logo']; text('ESTO ES...', W / 2, 440, 18, '#fff'); if (lt > 1.25 && lg.complete && lg.naturalWidth) { const pop = Math.min(1, (lt - 1.25) / 0.25), lw = 560 * (0.7 + 0.3 * pop), lh = lw * lg.naturalHeight / lg.naturalWidth; ctx.drawImage(lg, W / 2 - lw / 2, 580 - lh / 2, lw, lh); } }
        else wrap(line, W / 2, 560, 16, '#fff', 1100, 36, Math.max(0, Math.floor(lt * 30)));
        if (!TOUCH) text('ENTER: saltar', W - 110, 30, 10, '#ccc'); // en el móvil ya está el botón SALTAR
      },
    },
    mode: {
      update(m) {
        const O = MODOS(), opts = O.length; if (S.toastT > 0) S.toastT--; S.modeSel = Math.min(S.modeSel, opts - 1);
        if (m.u) { S.modeSel = (S.modeSel + opts - 1) % opts; Sound.play('blip'); } if (m.d) { S.modeSel = (S.modeSel + 1) % opts; Sound.play('blip'); }
        const salir = () => { S.modeGrupo = null; S.modeSel = S.modeMain || 0; };
        if (m.back) { if (S.modeGrupo) { Sound.play('blip'); salir(); } else go('title'); return; }
        if (!m.ok) return;
        const id = O[S.modeSel][0], elegir = md => { S.mode = md; resetPicks(); Sound.voice('elige'); go('select'); };
        Sound.play('ok');
        if (id.startsWith('g:')) { S.modeMain = S.modeSel; S.modeGrupo = id.slice(2); S.modeSel = 0; S.toastT = 0; return; }
        if (id === 'volver') { salir(); return; }
        if (id === 'historia') elegir('arcade');
        else if (id === 'libre') elegir('libre');
        else if (id === 'conflictos') { if (CONF_ABIERTO()) elegir('conflictos'); else { Sound.play('block'); S.toast = 'SE ABRE AL LLEGAR A LA MONCLOA EN HISTORIA'; S.toastT = 150; } }
        else if (id === 'versus') { if (TOUCH) { S.toast = 'EL VERSUS SE JUEGA CON TECLADO O MANDOS'; S.toastT = 150; } else elegir('versus'); } // en el móvil solo hay controles para un jugador
        else if (id === 'online') { netClose(); NET.st = 'menu'; NET.msg = ''; NET.sel = 0; go('net'); }
        else if (id === 'diario') { S.dia = diaReto(); S.diaSel = 0; ensure([S.dia.a.id, S.dia.b.id]); ensureStage(S.dia.stage); go('diario'); }
        else if (id === 'locos') { S.locoSel = 0; go('locos'); }
        else if (id === 'training') elegir('training');
        else if (id === 'galeria') { S.galTab = 0; S.galSel = 0; S.galVer = null; go('galeria'); }
        else if (id === 'stats') { S.stats = null; Stats.load().then(r => { S.stats = r; }); go('stats'); }
        else if (id === 'code') { S.codeTxt = ''; S.codeMsg = ''; go('code'); }
        else if (id === 'controls') go('controls');
        else if (id === 'intro') { Sound.stopMusic(); Sound.narrate('historia'); go('story'); }
      },
      draw() {
        // lista a la izquierda, tarjeta con ilustración del modo elegido a la derecha
        bg('congreso', 0.5); const g = S.modeGrupo, O = MODOS(), sel = O[S.modeSel] || O[0];
        const gr = ctx.createLinearGradient(0, 0, 640, 0); gr.addColorStop(0, 'rgba(10,6,20,0.85)'); gr.addColorStop(1, 'rgba(10,6,20,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, 640, H); if (OX) { ctx.fillStyle = 'rgba(10,6,20,0.85)'; ctx.fillRect(-OX, 0, OX, H); }
        text(g ? GRUPOS[g] : 'ELIGE MODO', 72, 82, 34, '#ffe14a', 'left', '#3a0606');
        const gap = 12, y0 = 132, ph = TOUCH ? Math.min(88, Math.floor((700 - y0) / O.length) - gap) : g ? 62 : 72;
        O.forEach(([id, o, col], i) => {
          const on = i === S.modeSel, y = y0 + i * (ph + gap), x = 64 + (on ? 14 : 0), w = 470, vol = id === 'volver';
          pxCaja(x + 6, y + 8, w, ph, 4, 'rgba(0,0,0,0.5)');
          pxCaja(x, y, w, ph, 4, on ? (Math.floor(S.t / 10) % 2 ? '#ffe14a' : '#fff6b8') : '#2a2840'); pxCaja(x + 4, y + 4, w - 8, ph - 8, 4, on ? '#2a1808' : 'rgba(16,12,28,0.92)');
          pr(x + 4, y + 4, 10, ph - 8, col === '#555' ? '#555' : col);
          const F0 = TOUCH ? 22 : 18, fs = Math.min(F0, Math.floor(F0 * (w - 60) / Math.max(1, (ctx.font = `${F0}px ${FONT}`, ctx.measureText(o).width))));
          text(o, x + 32, y + ph / 2, fs, on ? '#ffe14a' : vol ? '#9aa' : (col === '#9aa' ? '#d8dcec' : col), 'left', '#0c0614');
          if (on) { const ax = x - 22, ay = y + ph / 2, b = Math.round(Math.abs(Math.sin(S.t * 0.13)) * 3) * 2; for (let j = 0; j < 5; j++) { pr(ax - b + j * 4 - 3, ay - (5 - j) * 3 - 3, 10, (5 - j) * 6 + 6, '#0c0614'); } for (let j = 0; j < 5; j++) pr(ax - b + j * 4, ay - (5 - j) * 3, 4, (5 - j) * 6, j > 2 ? '#fff6b8' : '#ffe14a'); }
          zona(x, y, w, ph, () => { S.modeSel = i; pressed.add('Enter'); });
        });
        // tarjeta del modo
        const IMGK = { historia: 'historia', diario: 'diario', 'g:solo': 'solo', 'g:multi': 'multi', 'g:extras': 'extras', libre: 'solo', conflictos: 'online', locos: 'solo', training: 'solo', versus: 'multi', online: 'online' }, ik = IMGK[sel[0]] || (g === 'solo' ? 'solo' : g === 'multi' ? 'multi' : 'extras');
        const cx = 590, cy = 112, cw = 630, ch = 500, acc = sel[2] === '#9aa' || sel[2] === '#555' ? '#ffe14a' : sel[2];
        if (S.modeVisto !== sel[0]) { S.modeVisto = sel[0]; S.modeT = S.t; } const fa = Math.min(1, (S.t - (S.modeT || 0)) / 10);
        pxCaja(cx + 8, cy + 10, cw, ch, 4, 'rgba(0,0,0,0.55)'); pxCaja(cx, cy, cw, ch, 4, '#0c0614'); pxCaja(cx + 4, cy + 4, cw - 8, ch - 8, 4, acc); pxCaja(cx + 10, cy + 10, cw - 20, ch - 20, 4, '#141222');
        const ix = cx + 18, iy = cy + 18, iw = cw - 36, ih = 316, im = IMG['menu/' + ik];
        ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip(); ctx.fillStyle = '#0c0614'; ctx.fillRect(ix, iy, iw, ih);
        if (im && im.complete && im.naturalWidth) { const r = Math.max(iw / im.naturalWidth, ih / im.naturalHeight) * (1.06 - 0.06 * fa), sw = iw / r, sh = ih / r, was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.globalAlpha = fa; ctx.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, ix, iy, iw, ih); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = was; }
        if (sel[2] === '#555') { ctx.fillStyle = 'rgba(12,6,20,0.7)'; ctx.fillRect(ix, iy, iw, ih); text('BLOQUEADO', ix + iw / 2, iy + ih / 2, 28, '#fff', 'center', '#0c0614'); }
        const gb = ctx.createLinearGradient(0, iy + ih - 70, 0, iy + ih); gb.addColorStop(0, 'rgba(20,18,34,0)'); gb.addColorStop(1, 'rgba(20,18,34,1)'); ctx.fillStyle = gb; ctx.fillRect(ix, iy + ih - 70, iw, 70);
        ctx.restore();
        const nombre = sel[1].replace(/^VERSUS: SOLO EN ORDENADOR$/, 'VERSUS');
        text(nombre.length > 22 ? nombre.split(':')[0] : nombre, ix + 6, iy + ih + 34, nombre.length > 22 ? 24 : 28, '#ffe14a', 'left', '#3a0606');
        if (S.toastT > 0) wrap(S.toast, cx + cw / 2, iy + ih + 92, 12, '#ff6b5e', cw - 60, 22);
        else if (sel[3]) { const dl = wrapLines(sel[3], 13, cw - 60); dl.forEach((l, i) => text(l, ix + 6, iy + ih + 86 + i * 24, 13, '#e8e4f4', 'left', '#0c0614')); }
        if (!g && Unlock.pending()) text(Unlock.pending() + ' PERSONAJES POR DESBLOQUEAR', 72, 668, 10, '#9aa', 'left');
        text(TOUCH ? 'Toca una opción' : 'W/S o flechas  -  ENTER aceptar  -  ' + (g ? 'ESC volver' : 'M silencia'), W - 60, 690, 10, '#ccc', 'right');
      },
    },
    // código secreto: se escribe dentro del juego (window.prompt no funciona cuando el juego va incrustado en una web)
    code: {
      update() {
        if (S.t < 3) return;
        for (const c of pressed) {
          const ch = /^Key[A-Z]$/.test(c) ? c[3] : /^(Digit|Numpad)\d$/.test(c) ? c.slice(-1) : '';
          if (ch && S.codeTxt.length < 20) { S.codeTxt += ch; S.codeMsg = ''; Sound.play('blip'); }
          else if (c === 'Backspace') { S.codeTxt = S.codeTxt.slice(0, -1); S.codeMsg = ''; }
          else if (c === 'Escape') { go('mode'); return; }
          else if (c === 'Enter' || c === 'NumpadEnter') {
            if (!S.codeTxt) { go('mode'); return; }
            if (S.codeTxt.trim().toUpperCase() === 'BLOQUEAR') { Unlock.reset(); Sound.play('ok'); S.codeMsg = 'PERSONAJES OCULTOS BLOQUEADOS OTRA VEZ'; S.codeTxt = ''; return; } // para pruebas: vuelve a esconderlos en este navegador
            const before = FIGHTERS.filter(f => f.locked && !Unlock.has(f)), ok = Unlock.code(S.codeTxt);
            if (ok === 'caducado') { Sound.play('block'); S.codeMsg = 'ESE CÓDIGO DE LA SEMANA YA HA CADUCADO'; S.codeTxt = ''; return; }
            Sound.play(ok ? 'heal' : 'block');
            if (ok) { const now = before.filter(f => Unlock.has(f)); S.unl = ok === 'todos' ? (now.length ? now : FIGHTERS.filter(f => f.locked && Unlock.has(f))) : [ok]; if (S.unl.length === 1) Sound.voice('nombre_' + S.unl[0].id); go('unlocked'); return; }
            S.codeMsg = 'CÓDIGO INCORRECTO'; S.codeTxt = '';
          }
        }
      },
      draw() {
        bg('senado', 0.8); text('CÓDIGO SECRETO', W / 2, 150, 34, '#ffe14a');
        text(TOUCH ? 'Toca la casilla, escribe el código y pulsa OK' : 'Escribe el código con el teclado y pulsa ENTER', W / 2, 220, 12, '#fff');
        if (!TOUCH || !document.querySelector('#tc .code')) { // en pantalla táctil la casilla es un campo HTML (touch.js)
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(W / 2 - 330, 290, 660, 96); ctx.lineWidth = 4; ctx.strokeStyle = '#ffe14a'; ctx.strokeRect(W / 2 - 330, 290, 660, 96);
          text(S.codeTxt + (Math.floor(S.t / 25) % 2 ? '_' : ' '), W / 2, 340, 30, '#fff');
        }
        if (S.codeMsg) text(S.codeMsg, W / 2, 440, 16, '#ff3b30');
        text(Unlock.pending() ? Unlock.pending() + ' PERSONAJES POR DESBLOQUEAR' : 'YA TIENES A TODOS LOS PERSONAJES', W / 2, 500, 11, '#9aa');
        const cp = Unlock.partida(); // código de partida: para llevarse lo desbloqueado a otro móvil u ordenador
        if (cp) { text('TU CÓDIGO DE PARTIDA:  ' + cp, W / 2, 560, 16, '#3ddc6a'); text('Escríbelo aquí en otro móvil u ordenador y recuperas tus personajes', W / 2, 594, 10, '#ccc'); }
        if (!TOUCH) text('BORRAR corrige  -  ESC vuelve', W / 2, 660, 11, '#ccc');
      },
    },
    // aviso tras un código correcto: foto y nombre de quien se ha desbloqueado
    // créditos al acabar del todo, con el reparto y el anuncio de la siguiente entrega
    creditos: {
      update(m) { const fin = S.credFin || 99999; if (m.ok && S.t > 30) { if (S.t < fin) S.t = fin; else { Sound.music('menu'); go('title'); } } if (m.back) { Sound.music('menu'); go('title'); } },
      draw() {
        const t = S.t, rep = FIGHTERS.filter(f => !f.secret && !f.variantOf && !f.vetado), sc = t * 2.2;
        ctx.fillStyle = '#07070f'; ctx.fillRect(-OX, 0, VW, H);
        let y = H + 40 - sc; const line = (s, size, col, gap) => { if (y > -60 && y < H + 60) text(s, W / 2, y, size, col); y += gap; };
        line("MONCLOA'S FIGHTER", 44, '#ffe14a', 110);
        line('IDEA, GUION Y DIRECCIÓN DE ARTE', 13, '#39d0ff', 34); line('GASTÓN BRUNO', 22, '#fff', 80);
        line('CARICATURAS Y RETOQUE DE SPRITES', 13, '#39d0ff', 34); line('GASTÓN BRUNO', 22, '#fff', 80);
        line('PROGRAMACIÓN', 13, '#39d0ff', 34); line('GASTÓN BRUNO CON CLAUDE CODE', 18, '#fff', 80);
        line('VOCES Y MÚSICA', 13, '#39d0ff', 34); line('ELEVENLABS · LYRIA', 18, '#fff', 110);
        line('EL REPARTO', 26, '#ffe14a', 90);
        rep.forEach((f, i) => { const x = W / 2 + (i % 2 ? 270 : -270); if (y > -240 && y < H + 260) { sprite(f.id, 'idle', x - 150, y + 120, 170 / META[f.id].idle.h * (f.height / 400), 1); text(shownName(f.id), x + 70, y + 60, 12, '#fff'); text(Unlock.has(f) ? f.title : '???', x + 70, y + 92, 8, '#9aa'); } if (i % 2) y += 190; });
        y += 60; if (S.dif === 'facil') { line('Termina el camino en MEDIO o más difícil y sonará el teléfono rojo...', 13, '#ff6b5e', 70); } line('Y ahora que se han desahogado aquí dentro...', 16, '#fff', 44); line('todos a trabajar donde tienen que trabajar.', 16, '#fff', 110);
        line('Parodia satírica sin relación con ningún partido ni institución.', 10, '#889', 30); line('Cualquier parecido con la realidad es pura coincidencia electoral.', 10, '#889', 200);
        S.credFin = Math.round((H + 40 + (y - (H + 40 - sc)) - H * 0.5) / 2.2);
        if (y < H * 0.5 + 2) { // PRÓXIMAMENTE: se queda parado
          const k = Math.min(1, (t - S.credFin) / 30); ctx.globalAlpha = Math.max(0, k);
          text('PRÓXIMAMENTE', W / 2, 170, 26, '#ff3b30'); const pop = 1 + Math.sin(t * 0.06) * 0.03; ctx.save(); ctx.translate(W / 2, 300); ctx.scale(pop, pop); text("MONCLOA'S", 0, -40, 54, '#ffe14a', 'center', '#7a0d0d'); text('INTERNATIONAL FIGHTERS', 0, 40, 42, '#ffe14a', 'center', '#7a0d0d'); ctx.restore();
          const jf = FIGHTERS.filter(f => f.secret); jf.forEach((f, i) => { const x = W / 2 + (i - (jf.length - 1) / 2) * 118, im = IMG[f.id + '/face']; if (im && im.complete) { ctx.save(); if (!Unlock.has(f)) ctx.filter = 'brightness(0)'; ctx.drawImage(im, x - 52, 440, 104, 104); ctx.restore(); ctx.lineWidth = 3; ctx.strokeStyle = '#ffe14a'; ctx.strokeRect(x - 52, 440, 104, 104); } });
          if (t > S.credFin + 60 && Math.floor(t / 30) % 2) text('ENTER', W / 2, 640, 16); ctx.globalAlpha = 1;
        }
      },
    },
    // aviso del reto final: alerta, silueta que se revela, el conflicto y un único intento
    reto: {
      update(m) {
        const R = S.reto; if (!R) { go('title'); return; }
        if (S.t === 1) Sound.play('super'); if (S.t === 100) { Sound.play('heavy'); Sound.voice('nombre_' + R.boss.id); }
        if (m.ok && S.t > 40) { if (S.t < 100) S.t = 100; else if (S.t > 130 && !LISTO(R.boss)) { Sound.music('menu'); S.reto = null; go('title'); } else if (S.t > 130) {
          Sound.play('ok'); S.vs = { a: FIGHTERS[S.sel[0]], b: R.boss, al: [null, null], stage: R.stage, label: R.de > 1 ? 'RETO INTERNACIONAL ' + R.n + ' DE ' + R.de : 'EL ÚLTIMO RETO', reto: true }; go('vs'); } }
      },
      draw() {
        const R = S.reto; if (!R) return; const b = R.boss, t = S.t, reveal = t >= 100;
        bg(R.stage, 0.78);
        if (Math.floor(t / 16) % 2 || t > 100) { ctx.fillStyle = '#b3121f'; ctx.fillRect(0, 26, W, 54); text('¡ALERTA INTERNACIONAL!', W / 2, 64, 26, '#fff', 'center', '#5a0008'); }
        text(R.n > 1 ? '¡OTRA VEZ EL TELÉFONO ROJO!' : 'AHORA QUE ESTÁS EN LA MONCLOA...', 430, 140, 18, '#fff'); text(!(R.de > 1) ? '¡TIENES UN ÚLTIMO RETO!' : R.n === R.de ? '¡EL ÚLTIMO RETO! (' + R.n + ' DE ' + R.de + ')' : '¡RETO ' + R.n + ' DE ' + R.de + '!', 430, 186, 24, '#ffe14a', 'center', '#7a0d0d');
        // el presidente: primero en silueta, luego se revela con un fogonazo
        const k = 520 / META[b.id].idle.h * (b.height / 400);
        ctx.save(); if (!reveal) ctx.filter = 'brightness(0)'; sprite(b.id, reveal && t < 140 ? 'win' : 'idle', 1010, 690, k, -1); ctx.restore();
        if (reveal && t < 112) { ctx.fillStyle = `rgba(255,255,255,${1 - (t - 100) / 12})`; ctx.fillRect(-OX, 0, VW, H); }
        if (reveal) {
          text(b.name, 430, 262, 30, '#ffe14a', 'center', '#7a0d0d'); text(b.title.toUpperCase(), 430, 300, 13, '#fff');
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(70, 330, 720, 190); wrap((window.RETOS || {})[b.id] || '', 430, 372, 14, '#fff', 680, 30);
          text('Hay que resolverlo a puñetazos.', 430, 500, 13, '#3ddc6a');
          text('UN SOLO COMBATE, SIN ALIADOS. SI PIERDES, VUELVES A EMPEZAR.', 430, 570, 12, '#ff6b5e');
          if (!R.nuevo) text('(ya lo tienes: esta vez es por el honor)', 430, 600, 10, '#9aa');
          if (!LISTO(b)) text('(AVANCE: el combate llega cuando estén todos sus dibujos)', 430, 630, 10, '#ffe14a');
          if (t > 130 && Math.floor(t / 30) % 2) text(LISTO(b) ? 'ENTER: ¡A PUÑETAZOS!' : 'ENTER: VOLVER', 430, 660, 16);
        } else text('?????', 430, 262, 30, '#888');
      },
    },
    unlocked: {
      update(m) { if ((m.ok && S.t > 25) || m.back) { if (S.unlConf) { S.unlConf = false; Sound.music('menu'); go('conflictos'); return; } if (S.unlReto) { S.unlReto = false; if (S.retosLeft > 0) { startReto(); return; } Sound.music('moncloa'); go('creditos'); } else go('mode'); } },
      draw() {
        bg('moncloa', 0.82); const L = S.unl || [], n = L.length, pop = 1 + Math.max(0, 14 - S.t) * 0.03;
        text(n > 1 ? '¡HAS DESBLOQUEADO A TODOS!' : S.unlReto || S.unlConf ? '¡PRESIDENTE CONQUISTADO! YA PUEDES JUGAR CON' : '¡HAS DESBLOQUEADO A', W / 2, 96, S.unlReto ? 22 : 30, '#3ddc6a', 'center', '#0b3d1c');
        const sz = n > 1 ? 150 : 300, gap = n > 1 ? 40 : 0, tot = n * sz + (n - 1) * gap, y = n > 1 ? 250 : 170;
        L.forEach((f, i) => {
          const x = W / 2 - tot / 2 + i * (sz + gap), s = sz * pop, o = (s - sz) / 2;
          ctx.fillStyle = '#ffe14a'; ctx.fillRect(x - o - 8, y - o - 8, s + 16, s + 16); ctx.fillStyle = f.color; ctx.fillRect(x - o, y - o, s, s);
          ctx.drawImage(IMG[f.id + '/face'], x - o, y - o, s, s);
          if (n > 1) wrap(f.name, x + sz / 2, y + sz + 34, 10, '#fff', sz + 30, 18); else { text(f.name + '!', W / 2, y + sz + 54, 30, '#ffe14a', 'center', '#7a0d0d'); text(f.title, W / 2, y + sz + 96, 13, '#fff'); }
        });
        if (S.t > 25 && Math.floor(S.t / 30) % 2) text('ENTER', W / 2, 680, 16);
      },
    },
    stats: {
      update(m) { if (m.l || m.r) { S.statsPage = ((S.statsPage || 0) + (m.r ? 1 : 3)) % 4; Sound.play('blip'); } if (m.ok || m.back) go('mode'); },
      draw() {
        bg('senado', 0.8); text(['ESTADÍSTICAS', 'ESTADÍSTICAS: ALIANZAS', 'TODOS LOS LUCHADORES', 'CURIOSIDADES'][S.statsPage || 0], W / 2, 60, 34, '#ffe14a');
        if (!S.stats) { text('CARGANDO...', W / 2, 360, 18); return; }
        const d = S.stats.datos; text(S.stats.guardado ? 'DATOS DE TODOS · SERVIDOR NO DISPONIBLE, ÚLTIMOS DEL ' + new Date(S.stats.guardado).toLocaleString('es-ES', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : S.stats.global ? 'DATOS DE TODOS LOS JUGADORES' : 'DATOS DE ESTE DISPOSITIVO', W / 2, 104, 11, S.stats.guardado ? '#ffcf33' : '#9fd8ff'); text(d.partidas + ' COMBATES', W / 2, 132, 13, '#fff');
        const bars = (title, obj, x, keys, colors, label) => {
          text(title, x, 180, 14, '#39d0ff', 'left'); const max = Math.max(1, ...keys.map(k => obj[k] || 0));
          keys.forEach((k, i) => { const v = obj[k] || 0, y = 222 + i * 56; ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y, 440, 26); ctx.fillStyle = colors[i]; ctx.fillRect(x, y, 440 * v / max, 26); text(label(k), x, y - 12, 10, '#fff', 'left'); text(String(v), x + 450, y + 13, 12, '#ffe14a', 'left'); });
        };
        text(TOUCH ? '<  PÁGINA ' + ((S.statsPage || 0) + 1) + ' DE 4  >   TOCA LOS LADOS' : '<  página ' + ((S.statsPage || 0) + 1) + ' de 4  >   (izquierda / derecha)', W / 2, 660, TOUCH ? 15 : 10, '#9fd8ff');
        if (S.statsPage === 2) {
          // ranking completo: también se ven los menos elegidos
          const all = FIGHTERS.map(f => f.id).sort((a, b) => (d.elegidos[b] || 0) - (d.elegidos[a] || 0)), max = Math.max(1, ...all.map(k => d.elegidos[k] || 0)), half = Math.ceil(all.length / 2);
          all.forEach((k, i) => {
            const col = i < half ? 0 : 1, row = col ? i - half : i, x = 70 + col * 600, y = 168 + row * 31, v = d.elegidos[k] || 0;
            text((i + 1) + '. ' + shownName(k), x, y + 8, 9, i >= all.length - 3 ? '#ff8a80' : '#fff', 'left');
            ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 250, y, 250, 16); ctx.fillStyle = (byId(k) || {}).color || '#888'; ctx.fillRect(x + 250, y, 250 * v / max, 16);
            text(String(v), x + 510, y + 8, 10, '#ffe14a', 'left');
          });
          text('ENTER para volver', W / 2, 690, 12, '#ccc'); return;
        }
        if (S.statsPage === 3) {
          const topOf = (o, n) => Object.keys(o || {}).filter(k => o[k] > 0).sort((a, b) => o[b] - o[a]).slice(0, n);
          const col = (title, x, lines) => { text(title, x, 172, 13, '#39d0ff', 'left'); if (!lines.length) text('Aún sin datos', x, 214, 10, '#888', 'left'); lines.forEach((l, i) => { text(l[0], x, 214 + i * 30, 10, '#fff', 'left'); text(l[1], x + 520, 214 + i * 30, 11, '#ffe14a', 'right'); }); };
          const pct = k => { const v = d.victorias[k] || 0, l = d.derrotas[k] || 0; return v + l >= 15 ? v / (v + l) : -1; };
          const ef = FIGHTERS.map(f => f.id).filter(k => pct(k) >= 0).sort((a, b) => pct(b) - pct(a));
          const stName = id => ((STAGES.find(s => s.id === id) || {}).name || id).toUpperCase();
          col('MÁS EFICACES (% DE VICTORIAS)', 70, ef.slice(0, 3).map(k => [shownName(k), Math.round(pct(k) * 100) + ' %']).concat(ef.length > 3 ? [['... Y EL QUE MÁS PIERDE: ' + shownName(ef[ef.length - 1]), Math.round(pct(ef[ef.length - 1]) * 100) + ' %']] : []));
          col('ESCENARIOS MÁS JUGADOS', 690, topOf(d.escenarios, 14).filter(k => !(STAGES.find(st => st.id === k) || {}).secreto).slice(0, 4).map(k => [stName(k), String(d.escenarios[k])]));
          const dl = topOf(d.duelos, 1)[0];
          ctx.save(); ctx.translate(0, 190); // segunda fila de cuadros
          col('MÁS REMATES (INCONSTITUCIONALITY)', 70, topOf(d.remates, 3).map(k => [shownName(k), String(d.remates[k])]));
          col('MÁS RONDAS PERFECTAS', 690, topOf(d.perfectos, 3).map(k => [shownName(k), String(d.perfectos[k])]));
          ctx.restore();
          const cg = (d.contraCpu || {}).gana || 0, cp = (d.contraCpu || {}).pierde || 0;
          text(cg + cp ? 'HUMANOS CONTRA LA MÁQUINA: ' + Math.round(100 * cg / (cg + cp)) + ' % DE VICTORIAS HUMANAS' : 'HUMANOS CONTRA LA MÁQUINA: aún sin datos', W / 2, 560, 11, '#3ddc6a');
          if (dl) text('DUELO MÁS REPETIDO: ' + dl.split('>').map(shownName).join(' GANA A ') + ' (' + d.duelos[dl] + ')', W / 2, 594, 10, '#fff');
          text('Datos recogidos desde el 22 de octubre de 2026', W / 2, 626, 9, '#9aa');
          text('ENTER para volver', W / 2, 690, 12, '#ccc'); return;
        }
        if (S.statsPage === 1) {
          const nm = k => k.split('+').map(id => shownName(id)).join(' + ');
          const al = Object.keys(d.alianzas).sort((a, b) => d.alianzas[b] - d.alianzas[a]).slice(0, 8);
          if (al.length) bars('ALIANZAS MÁS ELEGIDAS', d.alianzas, 90, al, al.map(k => (byId(k.split('+')[0]) || {}).color || '#888'), k => nm(k) + '  (' + (d.alianzasVictorias[k] || 0) + ' victorias)');
          else text('Aún no se ha elegido ninguna alianza', 310, 300, 11, '#ccc');
          const pa = Object.keys(d.pactos).sort((a, b) => d.pactos[b] - d.pactos[a]).slice(0, 8);
          if (pa.length) bars('PACTOS POR IDEOLOGÍA', d.pactos, 700, pa, pa.map(k => k.includes('extrema') ? '#b06a2c' : k === 'derecha + izquierda' ? '#8a5fd0' : k.startsWith('derecha') ? '#1d84ce' : '#e30613'), k => k.toUpperCase());
          text('ENTER para volver', W / 2, 690, 12, '#ccc'); return;
        }
        const top = Object.keys(d.elegidos).sort((a, b) => d.elegidos[b] - d.elegidos[a]).slice(0, 8);
        if (top.length) bars('MÁS ELEGIDOS', d.elegidos, 90, top, top.map(k => (byId(k) || {}).color || '#888'), k => shownName(k));
        else text('Aún no hay partidas registradas', 310, 300, 11, '#ccc');
        const ids = ['extrema izquierda', 'izquierda', 'derecha', 'extrema derecha'];
        bars('VICTORIAS POR IDEOLOGÍA', d.ideologia, 700, ids, ['#8e3bb5', '#e30613', '#1d84ce', '#5cb531'], k => k.toUpperCase());
        text('(de ellas, con jugador humano: ' + ids.map(k => d.ideologiaHumanos[k] || 0).join(' / ') + ')', 700, 460, 9, '#ccc', 'left');
        text('ENTER para volver', W / 2, 690, 12, '#ccc');
      },
    },
    controls: {
      update(m) { if (m.ok || m.back) go('mode'); },
      draw() {
        bg('senado', 0.72); text('CONTROLES', W / 2, 90, 36, '#ffe14a');
        if (TOUCH) { // en el móvil se explican los botones de la pantalla, no el teclado
          const R = [['PALANCA', 'moverse · arriba salta · abajo se agacha'], ['MANTENER ATRÁS', 'bloquear'], ['DOS TOQUES ADELANTE', 'carrera'], ['PUÑO / PATADA', 'golpes (abajo + PATADA = barrido)'], ['ESP 1 / ESP 2', 'especiales y proyectiles'], ['SÚPER', 'con la barra llena'], ['ALIADO', 'llama a tu apoyo (abajo + ALIADO = cambiar)'], ['COMBOS', 'PUÑO > PUÑO > PATADA > ESP > SÚPER'], ['PAUSA', 'botón de arriba a la izquierda']];
          R.forEach((r, i) => { const y = 170 + i * 50; text(r[0], 560, y, 17, '#ffe14a', 'right', '#000'); text(r[1], 600, y, 15, '#fff', 'left', '#000'); });
          text('TOCA PARA VOLVER', W / 2, 670, 18, '#3ddc6a', 'center', '#000'); return;
        }
        const rows = [['', 'JUGADOR 1', 'JUGADOR 2'], ['Moverse', 'A / D', 'Flechas izq / der'], ['Saltar / Agacharse', 'W / S', 'Flecha arriba / abajo'], ['Bloquear', 'Mantener atrás', 'Mantener atrás'], ['Carrera', 'Doble toque A o D', 'Doble toque de flecha'], ['Puño', 'F', 'K'], ['Patada (abajo + patada = barrido)', 'G', 'L'], ['Especial 1 (proyectil)', 'R', 'I'], ['Especial 2', 'T', 'O'], ['SÚPER (barra llena)', 'Y', 'P'], ['Llamar a un APOYO', 'H', 'J'], ['CAMBIAR con tu aliado (lucha él)', 'Abajo + H', 'Abajo + J'], ['COMANDO: proyectil (+15 % daño)', 'abajo, adelante + puño', ''], ['COMANDO: especial 2 (+15 % daño)', 'abajo, atrás + patada', ''], ['COMANDO: gancho que lanza al aire', 'adelante, abajo, adelante + puño', ''], ['COMANDO: súper', 'abajo, abajo + puño', ''], ['COMANDO: barrido deslizante', 'abajo, adelante + patada', ''], ['COMANDO: puñetazo cargado', 'atrás, adelante + puño', ''], ['COMANDO: antiaéreo', 'abajo, atrás + puño', ''], ['INCONSTITUCIONALITY (al ganar)', 'botón de SÚPER', ''], ['INDULTALITY (al ganar: lo indultas)', 'ESP 1 o ESP 2', ''], ['Coger objeto del suelo y pegar con él (otra vez: lanzarlo)', 'S + F', 'Abajo + K'], ['PAUSA', 'ESC (o START del mando)', '']];
        rows.forEach((r, i) => { const y = 128 + i * Math.min(24, 470 / rows.length), c = i ? '#fff' : '#39d0ff', cmd = r[0].startsWith('COMANDO'); text(r[0], 110, y, 11, cmd ? '#3ddc6a' : '#ffe14a', 'left'); if (cmd) text(r[1], 920, y, 11, '#fff'); else { text(r[1], 780, y, 12, c); text(r[2], 1060, y, 12, c); } });
        text('COMBOS: si un golpe conecta, encadena  puño > puño > patada > especial > súper', W / 2, 612, 10, '#3ddc6a');
        text('También funciona con mandos (A puño, B patada, X/Y especiales, RB súper, LB apoyo)', W / 2, 640, 11, '#ccc'); text('ENTER para volver', W / 2, 680, 13);
      },
    },
    // como en Marvel vs Capcom: NORMAL o TURBO. Turbo: el combate va un tercio más rápido y se encadenan más golpes seguidos
    velocidad: {
      update(m) {
        if (m.l || m.r || m.u || m.d) { S.velSel ^= 1; Sound.play('blip'); }
        if (m.ok && S.t > 10) { VELOCIDAD = S.velSel ? 'turbo' : 'normal'; Sound.play('ok'); S.t = 0; S.estSel = ESTILO === 'puno' ? 0 : 1; go('estilo'); }
        if (m.back) { S.velElegida = false; S.wait = 0; resetPicks(); go('select'); }
      },
      draw() {
        bg('sol', 0.72); ctx.fillStyle = 'rgba(8,4,20,0.45)'; ctx.fillRect(-OX, 0, VW, H);
        text('ELIGE LA VELOCIDAD', W / 2, 70, 44, '#ffe14a', 'center', '#3a0606');
        [{ t: 'normal', n: 'NORMAL', d: 'EL RITMO DE SIEMPRE', v: 5, g: 3, a: '#123a86', b: '#07163f', l: '#5aa8ff' }, { t: 'turbo', n: 'TURBO', d: 'UN TERCIO MÁS RÁPIDO', v: 8, g: 5, a: '#a80f1c', b: '#3d0410', l: '#ffb01f' }].forEach((o, i) => {
          const on = S.velSel === i, x = W / 2 + (i ? 300 : -300), y = 360 + (on ? Math.round(Math.sin(S.t * 0.09) * 2) * 2 : 8), w = on ? 540 : 500, h = on ? 400 : 370;
          cartel(x - w / 2, y - h / 2, w, h, o.a, o.b, on, o.l, () => { if (i) fxTurbo(x - w / 2, y - h / 2, w, h, on); else fxNormal(x - w / 2, y - h / 2, w, h, on); }); zona(x - w / 2, y - h / 2, w, h, () => { if (on) pressed.add('Enter'); else { S.velSel = i; Sound.play('blip'); } });
          if (!logoAnim(o.t, x, y - 88, 2, S.t)) text(o.n, x, y - 100, 60, i ? '#ff3b30' : '#fff');
          text(o.d, x, y + 10, 13, on ? '#fff' : '#a9aec4', 'center', '#000');
          text('VELOCIDAD', x - 216, y + 62, 11, on ? o.l : '#8088a4', 'left', '#000'); chips(x - 216, y + 80, 8, o.v, 44, 18, on ? o.l : '#59607a', on && i ? S.t : -1);
          text('GOLPES SEGUIDOS', x - 216, y + 122, 11, on ? o.l : '#8088a4', 'left', '#000'); chips(x - 216, y + 140, 5, o.g, 34, 18, on ? '#ffe14a' : '#59607a', -1); text('X' + o.g, x + 216, y + 150, 26, on ? '#ffe14a' : '#8088a4', 'right', '#000');
          if (on) { const by = y - h / 2 - 22 + Math.abs(Math.sin(S.t * 0.12)) * -10; pxFlecha(x, Math.round(by / 2) * 2); }
        });
        if (Math.floor(S.t / 28) % 3) text(TOUCH ? 'TOCA UNA CARTA · TÓCALA OTRA VEZ PARA SEGUIR' : 'IZQUIERDA / DERECHA PARA CAMBIAR · ENTER PARA ACEPTAR', W / 2, 668, TOUCH ? 18 : 13, '#fff', 'center', '#000');
      },
    },
    // A PUÑO LIMPIO (solo golpes; la barra llena se gasta en CABREO) o CON TODO (especiales, objetos y súper)
    estilo: {
      update(m) {
        if (m.l || m.r || m.u || m.d) { S.estSel ^= 1; Sound.play('blip'); }
        if (m.ok && S.t > 10) { ESTILO = S.estSel ? 'todo' : 'puno'; Sound.play('ok'); if (S.mode === 'arcade' && !S.keepRun && !FINAL_PRUEBA) { S.difSel = Math.max(0, DIFS.indexOf(S.dif)); go('dificultad'); } else go('select'); }
        if (m.back) { S.t = 0; S.velSel = VELOCIDAD === 'turbo' ? 1 : 0; go('velocidad'); }
      },
      draw() {
        bg('sol', 0.72); ctx.fillStyle = 'rgba(8,4,20,0.45)'; ctx.fillRect(-OX, 0, VW, H);
        text('ELIGE CÓMO SE PELEA', W / 2, 70, 44, '#ffe14a', 'center', '#3a0606');
        [{ n: 'A PUÑO LIMPIO', d: ['SOLO PUÑETAZOS, PATADAS Y BARRIDOS', 'NADA DE LANZAR COSAS NI APOYOS', 'BARRA LLENA = ¡CABREO!', 'MÁS RÁPIDO Y MÁS DAÑO UNOS SEGUNDOS'], a: '#7a1a0c', b: '#2a0704', l: '#ff8a2e' },
         { n: 'CON TODO', d: ['ESPECIALES Y PROYECTILES', 'OBJETOS DEL ESCENARIO Y APOYOS', 'BARRA LLENA = ¡SÚPER!', 'EL CAOS DE SIEMPRE'], a: '#123a86', b: '#07163f', l: '#5aa8ff' }].forEach((o, i) => {
          const on = S.estSel === i, x = W / 2 + (i ? 300 : -300), y = 360 + (on ? Math.round(Math.sin(S.t * 0.09) * 2) * 2 : 8), w = on ? 540 : 500, h = on ? 400 : 370;
          cartel(x - w / 2, y - h / 2, w, h, o.a, o.b, on, o.l, () => { if (i) fxNormal(x - w / 2, y - h / 2, w, h, on); else fxTurbo(x - w / 2, y - h / 2, w, h, on); }); zona(x - w / 2, y - h / 2, w, h, () => { if (on) pressed.add('Enter'); else { S.estSel = i; Sound.play('blip'); } });
          text(o.n, x, y - 110, ajusta(o.n, i ? 50 : 44, w - 56), on ? '#fff' : '#c9cbe0', 'center', '#000');
          o.d.forEach((l, k) => text(l, x, y - 30 + k * 40, k === 2 ? 15 : 12, k === 2 ? (on ? '#ffe14a' : '#9a8a50') : on ? '#fff' : '#a9aec4', 'center', '#000'));
          if (on) { const by = y - h / 2 - 22 + Math.abs(Math.sin(S.t * 0.12)) * -10; pxFlecha(x, Math.round(by / 2) * 2); }
        });
        if (Math.floor(S.t / 28) % 3) text(TOUCH ? 'TOCA UNA CARTA · TÓCALA OTRA VEZ PARA SEGUIR' : 'IZQUIERDA / DERECHA PARA CAMBIAR · ENTER PARA ACEPTAR', W / 2, 668, TOUCH ? 18 : 13, '#fff', 'center', '#000');
      },
    },
    // el camino a la Moncloa: FÁCIL (8 paradas), MEDIO (9), DIFÍCIL (20, por toda España) o EXTRADIFÍCIL (todos los escenarios)
    dificultad: {
      update(m) {
        if (m.l || m.u) { S.difSel = (S.difSel + 3) % 4; Sound.play('blip'); } if (m.r || m.d) { S.difSel = (S.difSel + 1) % 4; Sound.play('blip'); }
        if (m.ok && S.t > 10) { S.dif = DIFS[S.difSel]; Sound.play('ok'); go('select'); }
        if (m.back) { S.t = 0; S.estSel = ESTILO === 'puno' ? 0 : 1; go('estilo'); }
      },
      draw() {
        bg('moncloa', 0.72); text('ELIGE TU CAMINO A LA MONCLOA', W / 2, 120, 28, '#ffe14a', 'center', '#7a0d0d');
        const tot = d => { const h = HIST[d]; return h.prim + h.camp + h.mad + (d === 'dificil' || d === 'extra' ? 2 : 1); }, cam = d => `${HIST[d].prim} de primarias, ${HIST[d].camp} ciudades de campaña y ${HIST[d].mad + (d === 'dificil' || d === 'extra' ? 2 : 1)} en Madrid.`;
        [['FÁCIL', tot('facil') + ' combates: ' + cam('facil') + ' La máquina pega menos.', 'Sin teléfono rojo.'], ['MEDIO', tot('medio') + ' combates: ' + cam('medio'), 'PREMIO: un personaje y una llamada del teléfono rojo.'], ['DIFÍCIL', tot('dificil') + ' combates: ' + cam('dificil') + ' La máquina es más dura.', 'PREMIO: dos personajes y dos llamadas del teléfono rojo.'], ['EXTRADIFÍCIL', tot('extra') + ' combates: ' + cam('extra') + ' La máquina no perdona.', 'PREMIO: tres personajes y tres llamadas del teléfono rojo.']].forEach((o, i) => {
          const on = S.difSel === i, x = W / 2 + (i - 1.5) * 308, y = 350 + (on ? Math.round(Math.sin(S.t * 0.09) * 2) * 2 : 8), w = on ? 298 : 278, h = on ? 372 : 348, A = ['#14703a', '#123a86', '#a80f1c', '#5b0d78'][i], B = ['#052a16', '#07163f', '#3d0410', '#1c0326'][i], l = ['#7df08e', '#5aa8ff', '#ffb01f', '#ff5be0'][i];
          cartel(x - w / 2, y - h / 2, w, h, A, B, on, l, () => { if (i >= 2) fxTurbo(x - w / 2, y - h / 2, w, h, on); else fxNormal(x - w / 2, y - h / 2, w, h, on); }); zona(x - w / 2, y - h / 2, w, h, () => { if (on) pressed.add('Enter'); else { S.difSel = i; Sound.play('blip'); } });
          const ts = Math.max(24, Math.min(40, Math.floor(40 * 250 / rAncho(o[0], 40))));
          text(o[0], x, y - 124, ts, on ? '#fff' : '#a9aec4', 'center', '#0c0614'); chips(x - 64, y - 84, 4, i + 1, 26, 14, on ? '#ffe14a' : '#59607a', -1);
          wrap(o[1], x, y - 46, 10, on ? '#fff' : '#a9aec4', 256, 22); wrap(o[2], x, y + 100, 10, on ? '#ffe14a' : '#8088a4', 256, 24);
          if (on) pxFlecha(x, Math.round((y - h / 2 - 22 + Math.abs(Math.sin(S.t * 0.12)) * -10) / 2) * 2);
        });
        if (Math.floor(S.t / 28) % 3) text(TOUCH ? 'TOCA UNA CARTA · TÓCALA OTRA VEZ PARA SEGUIR' : 'IZQUIERDA / DERECHA PARA CAMBIAR · ENTER PARA ACEPTAR', W / 2, 668, TOUCH ? 18 : 13, '#fff', 'center', '#000');
      },
    },
    select: {
      update(m) {
        const pest = ['versus', 'online', 'training', 'libre', 'conflictos'].includes(S.mode) && intlLibres().length > 0;
        if (pest && (pressed.has('KeyQ') || S.tabTap) && !S.picked[0] && !S.picked[1]) { S.bando = bandoDe() === 'mundo' ? 'es' : 'mundo'; Sound.play('special'); }
        S.tabTap = false;
        for (let p = 0; p < 2; p++) { const G0 = GRID(); if (!G0.length) break; if (!S.picked[p] && G0.indexOf(BASEF(FIGHTERS[S.sel[p]] || G0[0])) < 0) S.sel[p] = FIGHTERS.indexOf(G0[p % G0.length]); if (S.picked[p] && !S.apicked[p] && G0.indexOf(BASEF(FIGHTERS[S.asel[p]] || G0[0])) < 0) { const q = G0.find(d => canAlly(FIGHTERS[S.sel[p]], d) && Unlock.has(d)) || G0[0]; S.asel[p] = FIGHTERS.indexOf(q); } }
        const { n, cols } = selGrid(), two = S.mode === 'versus';
        const mv = (p, l, r, u, d, ok, alt) => {
          if (S.apicked[p]) return; const K = S.picked[p] ? 'asel' : 'sel', G = GRID(), cur = FIGHTERS[S[K][p]], b = BASEF(cur); let g = G.indexOf(b);
          if (l) g = (g + n - 1) % n; if (r) g = (g + 1) % n; if (u) g = (g - cols + n) % n; if (d) g = (g + cols) % n;
          let nf = G[g] === b ? cur : G[g];
          if (alt) { const vs = VARS(G[g]); if (vs.length > 1) { nf = vs[(vs.indexOf(nf) + 1) % vs.length]; Sound.play('special'); } }
          const s = FIGHTERS.indexOf(nf);
          if (s !== S[K][p]) { S[K][p] = s; if (!alt) Sound.play('blip'); }
          if (!ok) return; const f = FIGHTERS[s], me = FIGHTERS[S.sel[p]];
          if (!Unlock.has(f)) { Sound.play('blip'); S.lockMsg = 90; }
          else if (!S.picked[p]) {
            S.picked[p] = true; Sound.play('ok'); Sound.voice('nombre_' + f.id); Stats.record({ tipo: 'eleccion', personaje: f.id, modo: S.mode });
            // el cursor de aliado empieza en el primer aliado posible
            const first = FIGHTERS.findIndex(d => !d.variantOf && canAlly(f, d) && affine(f, d) && Unlock.has(d)); S.asel[p] = first >= 0 ? first : FIGHTERS.findIndex(d => !d.variantOf && canAlly(f, d) && Unlock.has(d));
            if (sinAliado()) { S.asel[p] = s; S.apicked[p] = true; }
          }
          else if (!canAlly(me, f)) { Sound.play('block'); S.allyMsg = 90; }
          else { S.apicked[p] = true; Sound.play('ok'); Sound.voice('nombre_' + f.id); Stats.record({ tipo: 'alianza', lider: me.id, aliado: f.id, pacto: pactOf(me, f), modo: S.mode }); }
        };
        const P = c => pressed.has(c);
        if (two) { mv(0, P('KeyA'), P('KeyD'), P('KeyW'), P('KeyS'), P('KeyF') || P('Space'), P('KeyG')); mv(1, P('ArrowLeft'), P('ArrowRight'), P('ArrowUp'), P('ArrowDown'), P('KeyK') || P('Enter'), P('KeyL')); }
        else mv(0, m.l, m.r, m.u, m.d, m.ok, m.alt);
        if (m.back) { S.wait = 0; if (S.picked[0] || S.picked[1]) resetPicks(); else if (S.mode === 'online') { NET.st = 'menu'; netClose(); go('net'); } else go('mode'); }
        if (S.apicked[0] && (!two || S.apicked[1]) && !S.wait) S.wait = 40;
        if (S.wait && --S.wait === 0) {
          if (S.mode === 'online') { VELOCIDAD = 'normal'; ESTILO = 'todo'; } // en online los dos navegadores tienen que ir igual
          else if (!S.velElegida) { S.velElegida = true; S.velSel = VELOCIDAD === 'turbo' ? 1 : 0; S.wait = 1; go('velocidad'); return; }
          S.velElegida = false;
          if (two) { S.stageSel = 0; go('stage'); }
          else if (S.mode === 'online') { NET.mine = { t: 'pick', f: FIGHTERS[S.sel[0]].id, a: FIGHTERS[S.asel[0]].id }; netSend(NET.mine); go('netwait'); }
          else if (S.mode === 'training') {
            const me = FIGHTERS[S.sel[0]], opp = shuffle(FIGHTERS.filter(d => !d.variantOf && !d.secret && BASEF(d) !== BASEF(me) && Unlock.has(d)))[0];
            S.vs = { a: me, b: opp, al: [FIGHTERS[S.asel[0]], null], stage: me.stage, label: 'ENTRENAMIENTO' }; go('vs');
          }
          else if (S.mode === 'legislatura') { S.legN = 0; S.legHp = 1; legSiguiente(); }
          else if (S.mode === 'mocion') mocionEmpieza();
          else if (S.mode === 'caos') caosSiguiente();
          else if (S.mode === 'libre') libreEmpieza();
          else if (S.mode === 'conflictos') { S.confSel = S.confSel || 0; Sound.music('menu'); go('conflictos'); }
          else if (S.mode === 'cumbre') { const me = FIGHTERS[S.sel[0]]; S.cumbre = shuffle(intlLibres().filter(d => BASEF(d) !== BASEF(me))); S.cumbreN = 0; cumbreSiguiente(); }
          else {
            if (S.keepRun && S.ladder) { // se cambia de personaje sin perder el progreso: si el nuevo estaba en la lista de rivales, se cambia por otro
              const me = FIGHTERS[S.sel[0]], al = FIGHTERS[S.asel[0]], choca = f => f && (BASEF(f) === BASEF(me) || BASEF(f) === BASEF(al));
              if (S.ladder.slice(S.step).some(choca) || (S.allyLadder || []).slice(S.step).some(choca)) montarRivales(S.step);
              S.keepRun = false; startArcadeFight();
            } else { S.keepRun = false; newHistoria(FIGHTERS[S.sel[0]]); if (FINAL_PRUEBA) { S.step = S.ladder.length - 1; S.dif = 'extra'; S.dif2 = true; S.retosLeft = 0; FINAL_PRUEBA = false; } startArcadeFight(); }
          }
        }
      },
      draw() {
        bg('sol', 0.35); const { n, cols, cs, gx, gy } = selGrid(), two = S.mode === 'versus';
        const pestanas = () => { if (['versus', 'online', 'training', 'libre', 'conflictos'].includes(S.mode) && intlLibres().length > 0) { const b = bandoDe(); [['ESPAÑA', 'es', -110], ['MUNDO', 'mundo', 110]].forEach(([t, k, dx]) => { const on = b === k; pr(W / 2 + dx - 90, 60, 180, 26, on ? '#ffe14a' : 'rgba(0,0,0,0.6)'); text(t, W / 2 + dx, 73, 13, on ? '#1a1420' : '#9aa', 'center'); }); text(TOUCH ? 'TOCA' : 'Q', W / 2, 73, 10, '#fff', 'center'); } };
        if (S.mode === 'cumbre') text('CUMBRE INTERNACIONAL', W / 2, 79, 12, '#39d0ff', 'center', '#000');
        if (S.lockMsg > 0) S.lockMsg--; if (S.allyMsg > 0) S.allyMsg--;
        // franjas laterales oscuras y marco central, como las pantallas de selección de las recreativas
        ctx.fillStyle = 'rgba(0,0,20,0.55)'; ctx.fillRect(-OX, 0, VW, H);
        const allyTurn = S.picked[0] && (!two || S.picked[1]);
        text(allyTurn ? 'ELIGE A TU ALIADO' : 'ELIGE A TU LÍDER', W / 2, (['versus', 'online', 'training', 'libre', 'conflictos'].includes(S.mode) && intlLibres().length > 0) ? 36 : 52, (['versus', 'online', 'training', 'libre', 'conflictos'].includes(S.mode) && intlLibres().length > 0) ? 24 : 30, allyTurn ? '#3ddc6a' : '#ffe14a');
        const rows = Math.ceil(n / cols);
        ctx.fillStyle = 'rgba(10,20,60,0.85)'; ctx.fillRect(gx - 10, gy - 10, cols * cs + 20, rows * cs + 20); ctx.lineWidth = 3; ctx.strokeStyle = '#39d0ff'; ctx.strokeRect(gx - 10, gy - 10, cols * cs + 20, rows * cs + 20);
        // luchador elegido a cada lado, grande, con su nombre debajo
        for (const [p, left] of [[0, true], [1, false]]) {
          if (!left && !two) continue; const f = FIGHTERS[S.sel[p]], x = left ? 170 : W - 170, base = 560;
          ctx.fillStyle = left ? 'rgba(255,59,48,0.18)' : 'rgba(57,168,255,0.18)'; ctx.fillRect(left ? -OX : W - 340, 90, 340 + OX, 520);
          if (f.vetado) { const m0 = META[f.id].idle, q = 360 / m0.h * (f.height / 400); ctx.save(); ctx.translate(x, base); ctx.scale((left ? 1 : -1) * q, q); ctx.drawImage(gris(f.id + '/idle', IMG[f.id + '/idle']), -m0.ax, -m0.h, m0.w, m0.h); ctx.restore(); text(f.name, x, 590, 16, '#bbb'); text('NO DISPONIBLE', x, 614, 11, '#ff3b30'); continue; }
          if (!Unlock.has(f)) { ctx.save(); ctx.filter = 'brightness(0)'; sprite(f.id, 'idle', x, base, 360 / META[f.id].idle.h * (f.height / 400), left ? 1 : -1); ctx.restore(); text('???', x, 590, 17, '#fff'); text('BLOQUEADO', x, 614, 11, '#ff3b30'); continue; }
          sprite(f.id, S.picked[p] ? 'win' : 'idle', x, base, 360 / META[f.id].idle.h * (f.height / 400), left ? 1 : -1);
          text(f.name, x, 590, 16, '#fff'); text(f.title, x, 614, 11, f.color === '#3b4a6b' ? '#9fb4ff' : '#ffe14a');
          if (VARS(BASEF(f)).length > 1 && !S.apicked[p] && (!S.picked[p] || true)) { // modos del luchador
            const pulse = Math.floor(S.t / 15) % 2;
            if (TOUCH && !two) { pr(x - 160, 98, 320, 62, 'rgba(0,0,0,0.7)'); ctx.lineWidth = 3; ctx.strokeStyle = pulse ? '#3ddc6a' : '#2a8a47'; ctx.strokeRect(x - 160, 98, 320, 62); text('◄ ' + (f.modo || 'NORMAL') + ' ►', x, 119, 16, '#3ddc6a', 'center', '#000'); text('TOCA PARA CAMBIAR DE MODO', x, 145, 9, '#fff', 'center', '#000'); zona(x - 160, 98, 320, 62, () => pressed.add('KeyG')); } else {
            text('◄ MODO: ' + (f.modo || 'NORMAL') + ' ►', x, 112, 13, pulse ? '#3ddc6a' : '#fff');
            text(TOUCH ? 'toca aquí para cambiar' : (two ? (left ? 'G' : 'L') : 'G / L') + ' para cambiar de modo', x, 132, 9, '#ccc'); }
          }
          if (S.picked[p] && !sinAliado()) { // aliado: delante del panel, más pequeño
            const al = FIGHTERS[S.asel[p]], ax = left ? x + 95 : x - 95, okA = canAlly(f, al) && Unlock.has(al);
            ctx.save(); if (!okA) ctx.filter = 'brightness(0.25)'; else if (!S.apicked[p]) ctx.globalAlpha = 0.75 + Math.sin(S.t * 0.2) * 0.2;
            sprite(al.id, 'idle', ax, base + 20, 190 / META[al.id].idle.h * (al.height / 400), left ? 1 : -1); ctx.restore();
            text(okA ? 'ALIADO: ' + al.name : (al.id === f.id ? 'ELIGE A OTRO' : !Unlock.has(al) ? 'BLOQUEADO' : 'NO PACTA CONTIGO'), x, 642, 10, okA ? '#3ddc6a' : '#ff3b30');
            if (okA) text('PACTO: ' + pactOf(f, al).toUpperCase(), x, 660, 8, '#ccc');
          }
        }
        // debajo de la rejilla: especiales y frase (arcade) o el VS (dos jugadores)
        const f0 = FIGHTERS[S.sel[0]], iy = gy + rows * cs + 34;
        if (TOUCH && !two) { // móvil: una sola cinta que pasa (especiales, rasgo y frase del modo elegido); los avisos salen fijos en su sitio
          const x0 = gx - 10, x1 = Math.min(gx + cols * cs + 10, W - 280), y = gy + rows * cs + 44;
          pr(x0, y - 22, x1 - x0, 44, 'rgba(0,0,0,0.55)');
          if (S.lockMsg > 0 || S.allyMsg > 0) text(S.lockMsg > 0 ? 'PERSONAJE BLOQUEADO' : 'ESE ALIADO NO ESTÁ DISPONIBLE', (x0 + x1) / 2, y, 14, '#ff3b30', 'center', '#000');
          else {
            const RG = RASGOS[rasgoDe(f0)], q = Unlock.has(f0) ? [f0.sp1.name, f0.sp2.name, 'SÚPER: ' + f0.super.name].concat(RG ? ['RASGO: ' + RG.n + ' - ' + RG.d.toUpperCase()] : [], ['"' + f0.quote + '"']) : [pista(f0)];
            const str = q.concat(['TOCA UNA CARA DOS VECES PARA ELEGIRLA']).join('   ★   ') + '   ★   ', key = f0.id + str.length;
            if (S.marqKey !== key) { S.marqKey = key; S.marqT = S.t; }
            ctx.font = `${tam(13)}px ${FONT}`; const wd = ctx.measureText(str.replace(/[ÁÉÍÓÚÑÜ]/g, 'A')).width, off = Math.max(0, (S.t - S.marqT - 40) * 2) % wd;
            ctx.save(); ctx.beginPath(); ctx.rect(x0 + 4, y - 22, x1 - x0 - 8, 44); ctx.clip();
            for (let k = 0; k < 3; k++) text(str, x0 + 12 - off + k * wd, y, 13, '#fff', 'left', '#000');
            ctx.restore();
          }
        }
        else if (two) text('VS', W / 2, iy + 40, 54, '#ff3b30');
        else if (!Unlock.has(f0)) wrap(pista(f0), W / 2, iy + 20, 11, '#ddd', 560, 26);
        else { text('ESPECIALES', W / 2, iy, 14, '#39d0ff'); [['R', f0.sp1.name], ['T', f0.sp2.name], ['Y', f0.super.name + ' (SÚPER)']].forEach((r, i) => text(r[0] + '  ' + r[1], W / 2, iy + 28 + i * 24, 11, '#fff')); const RG = RASGOS[rasgoDe(f0)]; if (RG) text('RASGO: ' + RG.n + ' - ' + RG.d.toUpperCase(), W / 2, iy + 100, 8, '#ffe14a'); wrap('"' + f0.quote + '"', W / 2, iy + 124, 10, '#ddd', 580); }
        GRID().forEach((f, i) => {
          const x = gx + (i % cols) * cs, y = gy + Math.floor(i / cols) * cs;
          const open = Unlock.has(f); ctx.fillStyle = open ? f.color : '#222'; ctx.fillRect(x + 3, y + 3, cs - 6, cs - 6);
          if (f.vetado) ctx.drawImage(gris(f.id + '/face', IMG[f.id + '/face']), x + 3, y + 3, cs - 6, cs - 6); else {
          ctx.save(); if (!open) ctx.filter = 'brightness(0) opacity(0.75)'; ctx.drawImage(IMG[f.id + '/face'], x + 3, y + 3, cs - 6, cs - 6); ctx.restore(); if (!open) text('?', x + cs / 2, y + cs / 2 + 4, 30, '#ffe14a'); }
          ctx.lineWidth = 3; ctx.strokeStyle = '#111'; ctx.strokeRect(x + 3, y + 3, cs - 6, cs - 6);
          const s1 = BASEF(FIGHTERS[S.sel[0]]) === f, s2 = two && BASEF(FIGHTERS[S.sel[1]]) === f, blink = Math.floor(S.t / 8) % 2;
          if (s1) { ctx.lineWidth = 6; ctx.strokeStyle = blink ? '#ff3b30' : '#ffe14a'; ctx.strokeRect(x + 2, y + 2, cs - 4, cs - 4); text('1P', x + 20, y + 13, 11, '#ff3b30'); }
          if (s2) { ctx.lineWidth = 6; ctx.strokeStyle = blink ? '#39a8ff' : '#ffffff'; ctx.strokeRect(x + (s1 ? 8 : 2), y + (s1 ? 8 : 2), cs - (s1 ? 16 : 4), cs - (s1 ? 16 : 4)); text('2P', x + cs - 20, y + 13, 11, '#39a8ff'); }
          for (const p of two ? [0, 1] : [0]) {
            if (!S.picked[p] || sinAliado()) continue;
            if (!two && !S.apicked[p] && !canAlly(FIGHTERS[S.sel[0]], f)) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x + 3, y + 3, cs - 6, cs - 6); }
            if (BASEF(FIGHTERS[S.asel[p]]) === f) { ctx.lineWidth = 5; ctx.setLineDash(S.apicked[p] ? [] : [8, 5]); ctx.strokeStyle = '#3ddc6a'; ctx.strokeRect(x + 5 + p * 5, y + 5 + p * 5, cs - 10 - p * 10, cs - 10 - p * 10); ctx.setLineDash([]); text('A' + (p + 1), x + (p ? cs - 20 : 20), y + cs - 11, 10, '#3ddc6a'); }
          }
        });
        if (!(TOUCH && !two)) text(S.lockMsg > 0 ? 'PERSONAJE BLOQUEADO' : S.allyMsg > 0 ? 'ESE ALIADO NO ESTÁ DISPONIBLE' : (TOUCH ? 'TOCA UNA CARA · TÓCALA OTRA VEZ PARA ELEGIRLA' : two ? '1P: WASD + F     2P: flechas + K' : 'Muévete y pulsa ENTER'), TOUCH && !two ? gx + cols * cs / 2 : W / 2, TOUCH && !two ? 696 : 702, TOUCH && !two ? 13 : 11, S.lockMsg > 0 || S.allyMsg > 0 ? '#ff3b30' : '#ccc');
        pestanas(); // ESPAÑA / MUNDO encima de todo, para que se vean
      },
    },
    // modo online: crear sala o entrar con un código, y la espera hasta que se conectan los dos
    net: {
      update(m) {
        if (NET.st === 'menu') {
          if (m.u) { NET.sel = (NET.sel + 2) % 3; Sound.play('blip'); } if (m.d) { NET.sel = (NET.sel + 1) % 3; Sound.play('blip'); }
          if (m.back) { go('mode'); return; }
          if (m.ok && S.t > 5) { Sound.play('ok'); if (NET.sel === 0) netCreate(); else if (NET.sel === 1) { NET.st = 'codigo'; S.codeTxt = ''; S.codeMsg = ''; S.t = 0; } else go('mode'); }
        } else if (NET.st === 'codigo') {
          if (S.t < 3) return;
          for (const c of pressed) {
            const ch = /^Key[A-Z]$/.test(c) ? c[3] : /^(Digit|Numpad)\d$/.test(c) ? c.slice(-1) : '';
            if (ch && S.codeTxt.length < 4) { S.codeTxt += ch; Sound.play('blip'); }
            else if (c === 'Backspace') S.codeTxt = S.codeTxt.slice(0, -1);
            else if (c === 'Escape') { NET.st = 'menu'; return; }
            else if ((c === 'Enter' || c === 'NumpadEnter') && S.codeTxt.length >= 4) { Sound.play('ok'); netJoin(S.codeTxt.slice(0, 4)); return; }
          }
        } else {
          if (NET.st === 'esperando' && pressed.has('KeyC')) netShare();
          if (m.back || (NET.st === 'error' && m.ok)) { Sound.play('blip'); NET.st = 'menu'; netClose(); NET.msg = ''; S.t = 0; }
        }
      },
      draw() {
        bg('congreso', 0.8); text('ONLINE: RETA A UN AMIGO', W / 2, 110, 32, '#3ddc6a');
        if (NET.st === 'menu') {
          ['CREAR SALA', 'ENTRAR CON UN CÓDIGO', 'VOLVER'].forEach((o, i) => { const on = i === NET.sel; opcion(o, W / 2, 300 + i * 80, on, on ? '#fff' : '#9aa'); });
          wrap('Crea una sala y pásale el código o el enlace a tu rival. Cada uno juega desde su ordenador o su móvil.', W / 2, 560, 12, '#ddd', 820, 28);
        } else if (NET.st === 'codigo') {
          text(TOUCH ? 'Toca la casilla, escribe el código y pulsa OK' : 'Escribe el código de 4 letras y pulsa ENTER', W / 2, 220, 12, '#fff');
          if (!TOUCH || !document.querySelector('#tc .code')) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(W / 2 - 200, 290, 400, 96); ctx.lineWidth = 4; ctx.strokeStyle = '#3ddc6a'; ctx.strokeRect(W / 2 - 200, 290, 400, 96);
            text(S.codeTxt + (Math.floor(S.t / 25) % 2 ? '_' : ' '), W / 2, 340, 40, '#fff');
          }
          if (!TOUCH) text('BORRAR corrige  -  ESC vuelve', W / 2, 660, 11, '#ccc');
        } else if (NET.st === 'esperando') {
          text('CÓDIGO DE LA SALA', W / 2, 220, 16, '#fff'); text(NET.code, W / 2, 310, 80, '#ffe14a', 'center', '#7a0d0d');
          text(netLink().replace(/^https?:\/\//, ''), W / 2, 410, 12, '#39d0ff');
          text(TOUCH ? 'TOCA AQUÍ PARA COMPARTIR EL ENLACE' : 'C: COPIAR EL ENLACE', W / 2, 450, 12, NET.copied > 0 ? '#3ddc6a' : '#fff'); if (NET.copied > 0) { NET.copied--; text('¡ENLACE COPIADO!', W / 2, 485, 12, '#3ddc6a'); }
          text('ESPERANDO A TU RIVAL' + '.'.repeat(1 + Math.floor(S.t / 20) % 3), W / 2, 560, 18, '#fff');
          text('ESC: cancelar', W / 2, 660, 11, '#ccc');
        } else if (NET.st === 'error') {
          wrap(NET.msg || 'ALGO HA FALLADO', W / 2, 320, 18, '#ff3b30', 900, 40); text('ENTER: volver', W / 2, 560, 14, '#fff');
        } else {
          text(NET.st === 'creando' ? 'CREANDO SALA...' : 'CONECTANDO CON ' + (NET.role === 'guest' ? 'LA SALA ' + NET.code : 'TU RIVAL') + '...', W / 2, 340, 22, '#fff');
          text('ESC: cancelar', W / 2, 660, 11, '#ccc');
        }
        if (NET.msg && NET.st !== 'error') text(NET.msg, W / 2, 620, 11, '#ffe14a');
      },
    },
    // online: ya has elegido; se espera a que elija el rival
    netwait: {
      update(m) {
        netReady();
        if (m.back) { NET.st = 'menu'; netClose(); go('net'); }
        if (!NET.ch) go('net');
      },
      draw() {
        bg('sol', 0.5); const me = byId(NET.mine.f), al = byId(NET.mine.a);
        sprite(me.id, 'win', 330, 600, 420 / META[me.id].idle.h * (me.height / 400), 1);
        text(me.name, 330, 640, 16); text('CON ' + al.name, 330, 668, 10, '#3ddc6a');
        if (NET.theirs) { const o = byId(NET.theirs.f); sprite(o.id, 'idle', W - 330, 600, 420 / META[o.id].idle.h * (o.height / 400), -1); text(o.name, W - 330, 640, 16); }
        else text('EL RIVAL ESTÁ ELIGIENDO' + '.'.repeat(1 + Math.floor(S.t / 20) % 3), W - 330, 360, 15, '#fff');
        text('VS', W / 2, 360, 70, '#ff3b30'); text('SALA ' + NET.code, W / 2, 80, 16, '#ffe14a');
      },
    },
    stage: {
      update(m) {
        const VIS = stagesVisibles(), n = VIS.length; if (m.l) { S.stageSel = (S.stageSel + n - 1) % n; Sound.play('blip'); } if (m.r) { S.stageSel = (S.stageSel + 1) % n; Sound.play('blip'); }
        if (m.back) { resetPicks(); go('select'); }
        if (m.ok && S.t > 10) { Sound.play('ok'); S.vs = { a: FIGHTERS[S.sel[0]], b: FIGHTERS[S.sel[1]], al: [FIGHTERS[S.asel[0]], FIGHTERS[S.asel[1]]], stage: VIS[S.stageSel].id, label: 'VERSUS' }; go('vs'); }
      },
      draw() { const VIS = stagesVisibles(), st = VIS[S.stageSel % VIS.length]; bg(st.id, 0.15); text('ELIGE ESCENARIO', W / 2, 70, 32, '#ffe14a'); text('<  ' + st.name.toUpperCase() + '  >', W / 2, 640, 24); text(TOUCH ? 'TOCA LOS LADOS PARA CAMBIAR · EL CENTRO PARA LUCHAR' : 'ENTER para luchar', W / 2, 690, TOUCH ? 16 : 12, '#ccc'); },
    },
    // mapa del camino a la Moncloa: el jugador avanza de la parada anterior a la siguiente
    // DEBATE ELECTORAL antes del combate final: pulsa la dirección que sale a tiempo; quien gane empieza con la barra de súper llena
    debate: {
      update(m) {
        const DIRS = ['u', 'd', 'l', 'r'], D = S.deb || (S.deb = { i: 0, t: 0, yo: 0, cpu: 0, seq: Array.from({ length: 6 }, () => DIRS[Math.floor(Math.random() * 4)]), temas: shuffle(['VIVIENDA', 'PENSIONES', 'INMIGRACIÓN', 'CATALUÑA', 'CORRUPCIÓN', 'EMPLEO', 'SANIDAD', 'EDUCACIÓN', 'IMPUESTOS', 'EL PRECIO DEL ACEITE']) });
        D.t++; if (S.t === 1) Sound.play('special');
        if (D.i >= 6) { if (D.t > 150 || (m.ok && D.t > 40)) { const gana = D.yo >= D.cpu; popSuma(gana ? 8 : -8, 'DEBATE'); S.efecto = Object.assign(S.efecto || {}, gana ? { meter: 100 } : { rivalMeter: 100 }); S.deb = null; go('vs'); } return; }
        const lim = 75 - D.i * 7, k = DIRS.find(d => m[d] || (S.debTap === d)); S.debTap = null;
        if (D.t > 24 && (k || D.t > 24 + lim)) { const ok = k === D.seq[D.i]; D.last = ok ? 'yo' : 'fallo'; if (ok) { D.yo++; Sound.play('ok'); } else Sound.play('block'); if (Math.random() < 0.42 + S.step * 0.015) { D.cpu++; D.last += '+cpu'; } D.i++; D.t = 0; }
      },
      draw() {
        const D = S.deb; drawStage('plato', (STAGE_W - W) / 2, 0.55); if (!D) return;
        const me = S.vs.a, op = S.vs.b;
        text('DEBATE ELECTORAL', W / 2, 60, 34, '#ffe14a', 'center', '#3a0606'); text(S.step === S.ladder.length - 1 ? 'QUIEN GANE EMPIEZA EL COMBATE FINAL CON EL SÚPER LLENO' : 'QUIEN GANE EMPIEZA EL COMBATE CON EL SÚPER LLENO', W / 2, 100, 10, '#fff', 'center', '#000');
        for (const [f, x] of [[me, 200], [op, W - 200]]) { pr(x - 90, 450, 180, 160, '#1d2b52'); pr(x - 90, 450, 180, 10, '#ffe14a'); const im = IMG[f.id + '/face']; pr(x - 80, 260, 160, 160, f.color); if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x - 80, 260, 160, 160); text(f.name, x, 640, 10, '#fff'); }
        text(String(D.yo), 200, 520, 54, '#3ddc6a', 'center', '#000'); text(String(D.cpu), W - 200, 520, 54, '#ff3b30', 'center', '#000');
        if (D.i < 6) {
          const dir = D.seq[D.i], lim = 75 - D.i * 7, vis = D.t > 24;
          text('TEMA: ' + D.temas[D.i], W / 2, 190, 16, '#fff', 'center', '#000');
          if (vis) {
            const ang = { r: 0, d: Math.PI / 2, l: Math.PI, u: -Math.PI / 2 }[dir]; ctx.save(); ctx.translate(W / 2, 380); ctx.rotate(ang);
            for (let i = 0; i < 8; i++) pr(-60 + i * 12, -60 + i * 8, 12, 120 - i * 16, '#ffe14a'); pr(-110, -22, 60, 44, '#ffe14a'); ctx.restore();
            const k = Math.max(0, 1 - (D.t - 24) / lim); pr(W / 2 - 160, 490, 320, 16, '#000'); pr(W / 2 - 156, 494, 312 * k, 8, k > 0.35 ? '#3ddc6a' : '#ff3b30');
          } else text('¿PREPARADO?', W / 2, 380, 22, '#9fd8ff', 'center', '#000');
          if (D.last && D.t < 24) text(D.last.startsWith('yo') ? '¡ZASCA!' : '¡SE TE HA VISTO EL PLUMERO!', W / 2, 270, 18, D.last.startsWith('yo') ? '#3ddc6a' : '#ff3b30', 'center', '#000');
          text(TOUCH ? 'Toca arriba, abajo, izquierda o derecha' : 'Pulsa la dirección de la flecha a tiempo', W / 2, 680, 11, '#ccc');
        } else text(D.yo >= D.cpu ? '¡GANAS EL DEBATE!' : 'PIERDES EL DEBATE', W / 2, 380, 30, D.yo >= D.cpu ? '#3ddc6a' : '#ff3b30', 'center', '#000');
      },
    },
    lab: {
      update(m) {
        const L = S.labCfg, lista = labLista(), N = lista.length, notis = ['azar', 'ninguna'].concat(NOTICIAS.map(n => n.id)), filas = 9;
        if (m.u) { S.labSel = (S.labSel + filas - 1) % filas; Sound.play('blip'); } if (m.d) { S.labSel = (S.labSel + 1) % filas; Sound.play('blip'); }
        const dd = (m.r ? 1 : 0) - (m.l ? 1 : 0), paso = pressed.has('ShiftLeft') || pressed.has('ShiftRight') ? 10 : 1;
        if (dd) {
          Sound.play('blip'); const k = S.labSel;
          if (k === 0) L.a = (L.a + dd * paso + N * 10) % N; if (k === 1) L.b = (L.b + dd * paso + N * 10) % N;
          if (k === 2) L.cpu = (L.cpu + dd + LAB_CPU.length) % LAB_CPU.length; if (k === 3) L.st = (L.st + dd + STAGES.length) % STAGES.length;
          if (k === 4) L.noticia = notis[(notis.indexOf(L.noticia) + dd + notis.length) % notis.length]; if (k === 5) L.boton = (L.boton + dd + 3) % 3;
          if (k === 6) L.vida = (L.vida + dd + 3) % 3; if (k === 7) L.apoyos = !L.apoyos;
        }
        // letras: saltar al primer luchador cuyo nombre o id empiece por esa letra
        for (const c of pressed) { const mm = /^Key([A-Z])$/.exec(c); if (mm && !'ADWSFKGL'.includes(mm[1]) && (S.labSel === 0 || S.labSel === 1)) { const i = lista.findIndex(f => f.id.toUpperCase().startsWith(mm[1])); if (i >= 0) { if (S.labSel === 0) L.a = i; else L.b = i; Sound.play('blip'); } } }
        if (m.ok && S.t > 10) { if (S.labSel === 8 || S.labSel <= 7) { Sound.play('ok'); labEmpieza(); } }
        if (m.back) go('locos');
      },
      draw() {
        const L = S.labCfg, lista = labLista(), a = lista[L.a], b = lista[L.b], st = STAGES[L.st], noti = NOTICIAS.find(n => n.id === L.noticia);
        drawStage(st.id, (STAGE_W - W) / 2, 0.55);
        text('LABORATORIO', W / 2, 54, 34, '#3ddc6a', 'center', '#04150a');
        for (const [f, x] of [[a, 150], [b, W - 150]]) { pr(x - 92, 120, 184, 184, f.color); const im = IMG[f.id + '/face']; if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x - 88, 124, 176, 176); text(f.name, x, 324, 10, '#fff', 'center', '#000'); const RG = RASGOS[rasgoDe(f)]; if (RG) text('RASGO: ' + RG.n, x, 346, 7, '#ffe14a', 'center', '#000'); if (f.fatal) text('REMATE: ' + f.fatal.name + ' (' + f.fatal.type + ')', x, 364, 7, '#ff7a3a', 'center', '#000'); if (f.secret) text('EXTRANJERO', x, 382, 7, '#39d0ff', 'center', '#000'); }
        const filas = [
          ['TÚ', `${a.name}  (${L.a + 1}/${lista.length})`], ['RIVAL', `${b.name}  (${L.b + 1}/${lista.length})`], ['CPU', LAB_CPU[L.cpu][0]], ['ESCENARIO', st.name.toUpperCase()],
          ['NOTICIA', L.noticia === 'azar' ? 'AL AZAR' : L.noticia === 'ninguna' ? 'NINGUNA' : noti.t], ['BOTÓN', ['EL NORMAL', 'SIEMPRE ROJO', 'SIEMPRE VERDE'][L.boton]],
          ['VIDA DEL RIVAL', ['100 %', '50 %', '10 % (PARA PROBAR REMATES)'][L.vida]], ['APOYOS', L.apoyos ? 'SÍ' : 'NO'], ['¡A PELEAR!', ''],
        ];
        filas.forEach(([k, v], i) => { const y = 168 + i * 40, on = S.labSel === i; if (on) pr(330, y - 18, 620, 34, 'rgba(61,220,106,0.25)'); text(k, 350, y, 10, on ? '#3ddc6a' : '#9aa', 'left', '#000'); text(v, 930, y, 10, on ? '#fff' : '#ccc', 'right', '#000'); });
        text('FLECHAS: ELEGIR Y CAMBIAR (MAYÚS: DE 10 EN 10)  ·  UNA LETRA (NO WASD): SALTA AL LUCHADOR  ·  ENTER: PELEAR', W / 2, 560, 8, '#fff', 'center', '#000');
        text('EN EL COMBATE  1: SÚPER LLENO · 2: RIVAL A 1 PUNTO · 3: BOTÓN ROJO · 4: BOTÓN VERDE · 5: ESCUDO · 6: OTRA NOTICIA · 7: VIDA LLENA', W / 2, 590, 8, '#ffe14a', 'center', '#000');
        text('ESC: VOLVER', W / 2, 640, 9, '#ccc', 'center', '#000');
      },
    },
    locos: {
      update(m) {
        if (S.toastT > 0) S.toastT--;
        const nL = LAB_OK() ? 5 : 4; if (m.u || m.l) { S.locoSel = (S.locoSel + nL - 1) % nL; Sound.play('blip'); } if (m.d || m.r) { S.locoSel = (S.locoSel + 1) % nL; Sound.play('blip'); }
        if (m.back) go('mode');
        if (m.ok && S.t > 10) {
          if (S.locoSel === 3) { Sound.play('ok'); S.mode = 'caos'; resetPicks(); Sound.voice('elige'); go('select'); return; }
          if (S.locoSel === 4) { Sound.play('ok'); S.labCfg = S.labCfg || { a: 0, b: 1, cpu: 2, st: 0, noticia: 'azar', boton: 0, vida: 0, apoyos: true }; S.labSel = 0; go('lab'); return; }
          if (S.locoSel === 2 && !CUMBRE_ABIERTA()) { Sound.play('block'); S.toast = 'BLOQUEADO'; S.toastT = 90; return; }
          Sound.play('ok'); S.mode = ['legislatura', 'mocion', 'cumbre'][S.locoSel]; resetPicks(); Sound.voice('elige'); go('select');
        }
      },
      draw() {
        bg('congreso', 0.65); text('¡MODOS LOCOS!', W / 2, 74, 40, '#ffe14a', 'center', '#3a0606');
        let rec = 0; try { rec = +localStorage.getItem('mf_legislatura') || 0; } catch (e) { }
        const ab = CUMBRE_ABIERTA(), L = [
          ['legislatura', 'LEGISLATURA', 'Rivales sin fin, a un asalto y con la vida que te quede.' + (rec ? ' RÉCORD: ' + rec : ''), '#14703a', '#052a16'],
          ['mocion', 'MOCIÓN DE CENSURA', 'Tú solo contra tres rivales del otro bloque, uno detrás de otro.', '#123a86', '#07163f'],
          ['cumbre', ab ? 'CUMBRE MUNDIAL' : '???', ab ? 'Solo con los líderes extranjeros que has conseguido.' : 'Consigue dos presidentes extranjeros para abrirla.', '#5b0d78', '#1c0326'],
          ['caos', 'MODO CAOS', 'Botón rojo, misiles, inmunidad y noticias de última hora.', '#a80f1c', '#3d0410'],
        ];
        if (LAB_OK()) L.push(['lab', 'LABORATORIO', 'Prueba cualquier luchador, escenario, noticia o arma.', '#3b4058', '#0c0614']);
        const n = L.length, gap = 16, cw = Math.min(280, Math.floor((W - 80 - (n - 1) * gap) / n)), x0 = W / 2 - (n * cw + (n - 1) * gap) / 2;
        const CH = { legislatura: rec ? 'RÉCORD: ' + rec : 'SUPERVIVENCIA', mocion: '1 CONTRA 3', cumbre: ab ? 'LÍDERES MUNDIALES' : 'BLOQUEADO', caos: 'TODO VALE', lab: 'PRUEBAS' };
        L.forEach(([id, t, d, A], i) => {
          const on = S.locoSel === i, off = id === 'cumbre' && !ab, x = x0 + i * (cw + gap), y = on ? 142 : 158;
          cartaBase({ x, y, cw, ch: 430, on, off, col: tono(A, 0.12), cab: 'MODO LOCO', arte: (cx, cy) => iconoDec(id, cx, cy, 5), chapa: CH[id], titulo: t, desc: d.replace(' RÉCORD: ' + rec, '') });
          if (on) pxFlecha(x + cw / 2, Math.round((y - 22 + Math.abs(Math.sin(S.t * 0.12)) * -10) / 2) * 2);
          zona(x, y, cw, 430, () => { S.locoSel = i; pressed.add('Enter'); });
        });
        if (S.toastT > 0) text(S.toast, W / 2, 616, 15, '#ff3b30');
        text(TOUCH ? 'Toca un modo' : 'Izquierda / derecha y ENTER  -  ESC: volver', W / 2, 670, 11, '#ccc');
      },
    },
    escandalo: {
      update(m) {
        if (S.t === 1) Sound.play('special');
        if (m.u || m.d || m.l || m.r) { S.escSel ^= 1; Sound.play('blip'); }
        if (m.ok && S.t > 30) {
          const e = S.esc.o[S.escSel].e; Sound.play('ok'); popSuma(POP_ESC[S.esc.o[S.escSel].n] || 0, 'ESCÁNDALO');
          if (e.quita && (S.decretos || []).length) S.decretos.splice(Math.floor(Math.random() * S.decretos.length), 1);
          S.decExtra = (e.extra || 0) + (S.escBonus || 0); S.escBonus = 0; S.efecto = Object.assign(S.efecto || {}, e); if (CFG.decretos === false) { startArcadeFight(); return; } tirarDecretos(); go('decreto');
        }
      },
      draw() {
        // portada de periódico que entra girando (izquierda) y las dos salidas como cartas (derecha)
        drawStage(S.route[S.step].stage, (STAGE_W - W) / 2, 0.82); pr(0, 0, W, H, 'rgba(60,0,10,0.28)');
        const e = S.esc, t = S.t, u = Math.min(1, t / 26), ez = 1 - Math.pow(1 - u, 3), papel = '#efe8d8', tinta = '#141018';
        ctx.save(); ctx.translate(330, 372); ctx.rotate(-0.045 + (1 - ez) * Math.PI * 4); ctx.scale(0.15 + 0.85 * ez, 0.15 + 0.85 * ez);
        pr(-242, -282, 500, 584, 'rgba(0,0,0,0.5)'); pr(-250, -292, 500, 584, papel);
        ctx.fillStyle = '#e2d9c4'; for (let yy = -288; yy < 288; yy += 6) for (let xx = -246 + (yy / 6 % 2 ? 3 : 0); xx < 246; xx += 6) ctx.fillRect(xx, yy, 2, 2);
        text('LA GACETA DE LA MONCLOA', 0, -258, 20, tinta, 'center', papel);
        pr(-230, -236, 460, 3, tinta); pr(-230, -230, 460, 1, tinta);
        text('ÚLTIMA HORA', -228, -218, 8, '#b0101c', 'left', papel); text('EDICIÓN ESPECIAL', 228, -218, 8, '#5a5248', 'right', papel); pr(-230, -206, 460, 1, tinta);
        const hl = wrapLines(e.t, 18, 440); hl.forEach((l, i) => text(l, 0, -180 + i * 30, 18, tinta, 'center', papel));
        const fy = -180 + hl.length * 30 - 6, fh = 238 - fy - 20, fw = 452, im = IMG['ui/escandalo_foto'];
        pr(-fw / 2 - 4, fy - 4, fw + 8, fh + 8, tinta);
        if (im && im.complete && im.naturalWidth) { const r = Math.max(fw / im.naturalWidth, fh / im.naturalHeight), sw = fw / r, sh = fh / r, was = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) * 0.3, sw, sh, -fw / 2, fy, fw, fh); ctx.imageSmoothingEnabled = was; }
        else pr(-fw / 2, fy, fw, fh, '#2a2638');
        // flashes de los fotógrafos sobre la foto
        if (u >= 1) for (let k = 0; k < 3; k++) { const c = Math.floor((t + k * 23) / 37), f = (t + k * 23) % 37; if (f < 5) { const r = n => { const x = Math.sin(n * 91.7 + k * 13.1) * 43758.5; return x - Math.floor(x); }, fx = -fw / 2 + 30 + r(c) * (fw - 60), fy2 = fy + 20 + r(c + 7) * (fh - 40), sz = (5 - f) * 7; ctx.fillStyle = 'rgba(255,255,240,0.9)'; ctx.fillRect(fx - sz, fy2 - 2, sz * 2, 4); ctx.fillRect(fx - 2, fy2 - sz, 4, sz * 2); ctx.fillRect(fx - sz / 3, fy2 - sz / 3, sz * 2 / 3, sz * 2 / 3); } }
        for (let k = 0; k < 3; k++) { const cx0 = -230 + k * 158; for (let j = 0; j < 3; j++) pr(cx0, 252 + j * 10, j === 2 ? 90 : 142, 4, '#b9b0a0'); }
        ctx.save(); ctx.translate(150, fy + 8); ctx.rotate(0.12); pr(-74, -18, 148, 36, '#c8101e'); pr(-70, -14, 140, 28, '#e5242e'); text('¡EXCLUSIVA!', 0, 1, 12, '#fff', 'center', '#8f0f19'); ctx.restore();
        ctx.restore();
        // decisión
        const k2 = Math.min(1, Math.max(0, (t - 14) / 16)), dx = (1 - k2) * 80;
        ctx.globalAlpha = k2; text('¿QUÉ HACES?', 932 + dx, 104, 30, '#ffe14a', 'center', '#3a0606');
        e.o.forEach((o, i) => {
          const on = S.escSel === i, x = 650 + dx + (on ? -14 : 0), y = 168 + i * 232, w = 570, h = 200;
          pxCaja(x + 8, y + 10, w, h, 4, 'rgba(0,0,0,0.55)'); pxCaja(x, y, w, h, 4, on ? (Math.floor(t / 10) % 2 ? '#ffe14a' : '#fff6b8') : '#3a3550'); pxCaja(x + 6, y + 6, w - 12, h - 12, 4, on ? '#2a1808' : '#141222');
          pxCaja(x + 24, y + 26, 64, 64, 4, '#0c0614'); pxCaja(x + 28, y + 30, 56, 56, 4, on ? '#e5242e' : '#3a3550'); text(i ? 'B' : 'A', x + 56, y + 59, 22, '#fff', 'center', on ? '#8f0f19' : '#0c0614');
          const nl = wrapLines(o.n, 18, w - 140); nl.forEach((l, j) => text(l, x + 110, y + 58 - (nl.length - 1) * 13 + j * 26, 18, on ? '#ffe14a' : '#fff', 'left', '#0c0614'));
          pr(x + 24, y + 108, w - 48, 2, on ? '#5a3a10' : '#2a2840');
          { const pn = POPON() && POP_ESC[o.n]; if (pn) text('POPULARIDAD ' + (pn > 0 ? '+' : '') + pn, x + w - 26, y + 92, 9, pn > 0 ? '#3ddc6a' : '#ff6b5e', 'right', '#0c0614'); }
          const d = o.d.replace(/ %/g, '%'), partes = d.split(', pero '), buena = /^(Empiezas.*llena|Firmas)/.test(partes[0]);
          const filas = partes.length > 1 ? [[partes[0], true], [partes[1][0].toUpperCase() + partes[1].slice(1), false]] : [[d, buena]];
          filas.forEach(([tx, bien], j) => { const yy = y + 138 + j * 30 - (filas.length - 1) * 8; pr(x + 30, yy - 9, 18, 18, bien ? '#178a3c' : '#8f0f19'); pr(x + 34, yy - 1, 10, 3, '#fff'); if (bien) pr(x + 38, yy - 5, 3, 10, '#fff');
            const tl = wrapLines(tx, 11, w - 110); tl.forEach((l, q) => text(l, x + 60, yy + q * 18, 11, bien ? '#9ff0b4' : '#ffb0a8', 'left', '#0c0614')); });
          zona(x, y, w, h, () => { S.escSel = i; pressed.add('Enter'); });
        });
        ctx.globalAlpha = 1;
        text(TOUCH ? 'Toca una opción' : 'Arriba / abajo y ENTER', 932, 662, 11, '#ccc');
      },
    },
    decreto: {
      update(m) {
        const n = S.cartas.length; if (!n) { S.decExtra = 0; startArcadeFight(); return; } // ya los tienes todos firmados
        if (m.l || m.u) { S.decSel = (S.decSel + n - 1) % n; Sound.play('blip'); }
        if (m.r || m.d) { S.decSel = (S.decSel + 1) % n; Sound.play('blip'); }
        if (m.ok && S.t > 30) {
          const c = S.cartas[S.decSel]; Sound.play('ok');
          if (c.id === 'pacto') { S.asel[0] = FIGHTERS.indexOf(c.f); Sound.voice('nombre_' + c.f.id); popSuma(popPacto(c.f), 'PACTO'); (S.pactos = S.pactos || []).push(c.f.id); }
          else { (S.decretos = S.decretos || []).push(c.id); popSuma(POP_DEC[c.id] || 0, 'DECRETO'); }
          if (S.decExtra > 0) { S.decExtra--; tirarDecretos(); S.t = 0; } else startArcadeFight();
        }
      },
      draw() {
        drawStage(S.route[S.step].stage, (STAGE_W - W) / 2, 0.8);
        text('FIRMA UN DECRETO', W / 2, 70, 40, '#ffe14a', 'center', '#3a0606');
        text(S.decExtra > 0 ? 'Y DESPUÉS, OTRO MÁS' : 'SE APLICA AL RESTO DEL CAMINO A LA MONCLOA', W / 2, 118, 11, '#fff', 'center', '#000');
        const n = S.cartas.length, cw = 340, gap = 30, x0 = W / 2 - (n * cw + (n - 1) * gap) / 2;
        S.cartas.forEach((c, i) => { const on = S.decSel === i; cartaDecreto(c, x0 + i * (cw + gap), on ? 140 : 156, on, DECRETOS.findIndex(d => d.id === c.id) + 1); });
        const ya = (S.decretos || []).map(decNombre);
        if (ya.length) wrap('EN VIGOR: ' + ya.join(' · '), W / 2, 604, 9, '#ffe14a', W - 160, 20);
        text(TOUCH ? 'Toca un decreto' : 'Izquierda / derecha y ENTER', W / 2, 680, 11, '#ccc');
      },
    },
    map: {
      update(m) { if (S.t === 70) Sound.play('ok'); if ((m.ok && S.t > 25) || S.t > 420) { Sound.play('ok'); if (S.mode === 'arcade' && (S.step === S.ladder.length - 1 || S.route[S.step].especial === 'debate') && CFG.debate !== false) { S.deb = null; ensureStage('plato'); ensure([S.vs.a.id, S.vs.b.id]); go('debate'); } else go('vs'); } },
      draw() {
        if (S.route[S.step].fase === 'primarias') { drawPrimarias(); return; }
        const R = S.route, k = S.step, me = FIGHTERS[S.sel[0]], opp = S.ladder[k], cur = R[k], t = S.t, enEspana = cur.mapa === 'espana', dif2 = !!cur.mapa, im = IMG[enEspana ? 'ui/mapa_espana' : 'ui/mapa'], D = window.RUTA_DIFICIL, mismo = r => (r.mapa || '') === (cur.mapa || '');
        ctx.fillStyle = '#1a1420'; ctx.fillRect(-OX, 0, VW, H);
        if (im && im.complete && im.naturalWidth) { const h = W * im.naturalHeight / im.naturalWidth; ctx.drawImage(im, 0, (H - h) / 2, W, h); }
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-OX, 0, VW, H);
        // camino: tramo hecho en rojo, pendiente en punteado
        for (let i = 1; i < R.length; i++) { const a = R[i - 1], b = R[i]; if (!mismo(a) || !mismo(b)) continue; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineWidth = 9; ctx.strokeStyle = '#1a1420'; ctx.setLineDash(i <= k ? [] : [5, 13]); ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = i <= k ? '#e30613' : '#fff'; ctx.stroke(); }
        ctx.setLineDash([]);
        if (enEspana) { // Madrid, en grande: allí acaba todo. De la última parada de España sale el último tramo hasta la capital
          const M = D.madridEnEspana, ult = R.filter(r => r.mapa === 'espana').pop(), late = Math.sin(t * 0.09) * 3, nm = R.filter(r => r.mapa === 'madrid').length;
          ctx.beginPath(); ctx.moveTo(ult.x, ult.y); ctx.lineTo(M.x, M.y); ctx.lineWidth = 9; ctx.strokeStyle = '#1a1420'; ctx.setLineDash([5, 13]); ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(M.x, M.y, 30 + late, 0, 7); ctx.fillStyle = '#1a1420'; ctx.fill(); ctx.beginPath(); ctx.arc(M.x, M.y, 25 + late, 0, 7); ctx.fillStyle = '#e30613'; ctx.fill(); ctx.beginPath(); ctx.arc(M.x, M.y, 13, 0, 7); ctx.fillStyle = '#ffe14a'; ctx.fill();
          const tm = 'MADRID: ' + nm + ' COMBATES', tw = txtAncho(tm, 11) + 24; ctx.fillStyle = 'rgba(16,12,26,0.88)'; ctx.fillRect(M.x - tw / 2, M.y - 66, tw, 28); text(tm, M.x, M.y - 52, 11, '#ffe14a');
        }
        const puestos = [];
        R.forEach((r, i) => {
          if (!mismo(r)) return;
          const done = i < k, now = i === k, rad = now ? 15 + Math.sin(t * 0.2) * 3 : 11;
          ctx.beginPath(); ctx.arc(r.x, r.y, rad + 4, 0, 7); ctx.fillStyle = '#1a1420'; ctx.fill();
          ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, 7); ctx.fillStyle = done ? '#3ddc6a' : now ? '#ffe14a' : i === R.length - 1 ? '#e30613' : '#fff'; ctx.fill();
          if (dif2 && !now && !(enEspana && r.ciudad) && i !== R.length - 1) return; // en DIFÍCIL hay muchas paradas: solo se rotula la actual y, en España, cada ciudad
          const name = dif2 && !now ? (enEspana ? r.ciudad : (R.length) + '. Palacio de la Moncloa') : (i + 1) + '. ' + ((STAGES.find(st => st.id === r.stage) || {}).name || r.stage), sz = now ? 11 : 9, tw = txtAncho(name, sz) + 16, bh = sz * 2 + 4;
          const lx = clamp(r.x + r.lx, tw / 2 + 24, W - tw / 2 - 24); let ly = now ? r.y + (r.y < 140 ? -34 : 34) : r.y + r.ly; // la parada actual, al lado contrario de las caras del VS
          for (let n = 0; n < 6 && puestos.some(b => Math.abs(b[0] - lx) < (b[2] + tw) / 2 + 4 && Math.abs(b[1] - ly) < (b[3] + bh) / 2 + 2); n++) ly += (r.ly < 0 ? -1 : 1) * (bh + 4); // que dos rótulos no se pisen
          puestos.push([lx, ly, tw, bh]);
          ctx.fillStyle = 'rgba(16,12,26,0.82)'; ctx.fillRect(lx - tw / 2, ly - sz - 2, tw, sz * 2 + 4);
          text(name, lx, ly, sz, now ? '#ffe14a' : done ? '#bfe8c8' : '#fff');
        });
        // el jugador viaja de la parada anterior a la actual; el rival espera en ella
        const from = k && mismo(R[k - 1]) ? R[k - 1] : { x: cur.x + 260, y: cur.y + 150 }, fy = cur.y < 140 ? 60 : -52, u = Math.min(1, t / 70), e = 1 - Math.pow(1 - u, 2), px = from.x + (cur.x - from.x) * e, py = from.y + (cur.y - from.y) * e - Math.sin(u * Math.PI) * 40;
        const face = (f, x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x - 31, y - 31, 62, 62); ctx.fillStyle = f.color; ctx.fillRect(x - 27, y - 27, 54, 54); ctx.drawImage(IMG[f.id + '/face'], x - 27, y - 27, 54, 54); };
        if (u >= 1) face(opp, cur.x + 44, cur.y + fy, '#39a8ff'); face(me, px - (u >= 1 ? 44 : 0), py + fy, '#ff3b30');
        if (u >= 1) text('VS', cur.x, cur.y + fy, 16, '#ffe14a', 'center', '#7a0d0d');
        ctx.fillStyle = 'rgba(10,8,18,0.86)'; ctx.fillRect(0, 0, W, 64); ctx.fillRect(0, H - 76, W, 76);
        text(dif2 ? (enEspana ? 'CAMINO A LA MONCLOA: TODA ESPAÑA' : 'CAMINO A LA MONCLOA: MADRID') : 'CAMINO A LA MONCLOA', W / 2, 24, 20, '#ffe14a'); text('PARADA ' + (k + 1) + ' DE ' + (R.length + (S.camp ? S.camp.left : 0)), W / 2, 50, 10, '#fff');
        if (POPON()) { popBarra(24, 14, 220); const p = popVal(); if (p >= 75 || p <= 25) { pr(14, 70, 430, 30, 'rgba(10,8,18,0.86)'); text(p >= 75 ? 'RESPALDO POPULAR: +10% DE VIDA' : 'ABUCHEOS: EL RIVAL PEGA UN 10% MÁS', 229, 85, 10, p >= 75 ? '#3ddc6a' : '#ff6b5e'); } }
        if (cur.especial && ESPECIALES[cur.especial]) { const E = ESPECIALES[cur.especial]; pr(W / 2 - 300, 70, 600, 34, 'rgba(10,8,18,0.86)'); text('PARADA ESPECIAL: ' + E.n, W / 2, 87, 12, E.col); }
        wrap(cur.txt, W / 2, H - 50, 12, '#fff', 1100, 22); if (t > 25 && Math.floor(t / 30) % 2) text('ENTER', W - 70, H - 16, 10, '#ffe14a');
      },
    },
    vs: {
      update(m) {
        if (S.t === 1) { // se decide ya el aliado de la CPU y se empiezan a cargar los cuatro luchadores del combate
          Sound.stopMusic(); Sound.play('super'); const v = S.vs, al = v.al || [];
          v.al = v.reto || v.conflicto ? [null, null] : [al[0] || cpuAlly(v.a, v.b), al[1] || cpuAlly(v.b, v.a)]; S.need = ensure([v.a.id, v.b.id, v.al[0] && v.al[0].id, v.al[1] && v.al[1].id]).concat(ensureStage(v.stage));
        }
        if ((S.t > 170 || (m.ok && S.t > 30)) && allLoaded(S.need || [])) beginMatch();
      },
      draw() {
        const v = S.vs, u = Math.min(1, S.t / 18); drawStage(v.stage, (STAGE_W - W) / 2, 0.6, true);
        ctx.fillStyle = v.a.color; ctx.globalAlpha = 0.5; ctx.fillRect(0, 0, W / 2 * u, H); ctx.fillStyle = v.b.color; ctx.fillRect(W - W / 2 * u, 0, W / 2 * u, H); ctx.globalAlpha = 1;
        sprite(v.a.id, 'idle', -200 + 500 * u, 640, 520 / META[v.a.id].idle.h * (v.a.height / 400), 1); sprite(v.b.id, 'idle', W + 200 - 500 * u, 640, 520 / META[v.b.id].idle.h * (v.b.height / 400), -1);
        text('VS', W / 2, 340, 110 * u, '#ffe14a', 'center', '#7a0d0d'); text(v.a.name, 300, 676, 18); text(v.b.name, W - 300, 676, 18);
        if (v.al) v.al.forEach((al, i) => { if (al) text('CON ' + al.name, i ? W - 300 : 300, 700, 10, '#3ddc6a'); });
        if (S.t > 170 && S.need && !allLoaded(S.need)) text('CARGANDO LUCHADORES... ' + Math.round(100 * S.need.filter(im => im.complete).length / S.need.length) + ' %', W / 2, 140, 12, '#fff');
        text(v.label, W / 2, 60, 22, '#fff'); text(STAGES.find(s => s.id === v.stage).name.toUpperCase(), W / 2, 100, 14, '#ffe14a');
      },
    },
    fight: {
      update() {
        const M = S.match;
        if (S.mode === 'online') { if (pressed.has('Escape')) { NET.st = 'menu'; netClose(); Sound.stopMusic(); Sound.music('menu'); go('mode'); return; } netFight(); if (S.screen !== 'fight') return; }
        else {
          // pausa: ESC / START del mando / botón SALIR del móvil (o al cambiar de pestaña) la abre; arriba-abajo y ENTER eligen
          const g0 = pad(0), st = g0 && g0.buttons[9] && g0.buttons[9].pressed, stEdge = st && !S.padStart; S.padStart = st;
          if (!S.paused && (pressed.has('Escape') || stEdge || S.autoPause)) { S.paused = true; S.pauseSel = 0; S.autoPause = false; Sound.play('blip'); return; }
          if (S.paused) {
            const m = menu();
            const NP = 3, salir = 2;
            if (m.u || m.d) { S.pauseSel = (S.pauseSel + (m.d ? 1 : NP - 1)) % NP; Sound.play('blip'); }
            if (m.back || stEdge) { S.paused = false; return; }
            if (m.ok && S.pauseSel === 1) { const o = ['si', 'ketchup', 'no']; SANGRE = o[(o.indexOf(SANGRE) + 1) % 3]; try { localStorage.setItem('mf_sangre', SANGRE); } catch (e) { } Sound.play('blip'); return; } // la sangre se cambia sin salir de la pausa
            if (m.ok) { S.paused = false; Sound.play('ok'); if (S.pauseSel === salir) { Sound.stopMusic(); Sound.music('menu'); go(S.mode === 'lab' ? 'lab' : 'mode'); } }
            return;
          }
          M.update(); if (VELOCIDAD === 'turbo' && S.t % 3 === 0 && !M.done) M.update();
          if (S.mode === 'diario' && !M.done) S.diaT = (S.diaT || 0) + 1;
        }
        if (M.done && M.bonus) { Sound.stopMusic(); S.bonusRes = bonusPremio(M.bonus.pct); S.bonusFase = 'fin'; go('bonus'); return; }
        if (M.done) { Sound.stopMusic(); const w = M.winner; if (S.mode === 'legislatura') S.legFin = Math.max(0.1, M.f[0].hp / M.f[0].maxHp); S.result = { winner: w.def, loser: (w === M.f[0] ? M.f[1] : M.f[0]).def, p1won: w === M.f[0], beaten: w.beaten };
          const lo = w === M.f[0] ? M.f[1] : M.f[0];
          if (S.mode === 'online') NET.on = false; // la partida solo la cuenta el anfitrión (si no, saldría dos veces)
          if (S.mode !== 'online' || NET.role === 'host') Stats.record({ tipo: 'partida', modo: S.mode, p1: M.f[0].id, p2: M.f[1].id, ganador: w.id, perdedor: lo.id, ideologia: w.def.ideologia, humano: !w.cpu, contraCpu: !w.cpu && lo.cpu ? 'gana' : w.cpu && !lo.cpu ? 'pierde' : '', alianza: w.allyDef ? w.id + '+' + w.allyDef.id : '', escenario: M.stage, remate: !!M.remate, perfectos: w.perfectos || 0 }); go('result'); }
      },
      draw() {
        S.match.draw();
        if (S.paused) {
          ctx.fillStyle = 'rgba(0,0,20,0.7)'; ctx.fillRect(-OX, 0, VW, H);
          text('PAUSA', W / 2, 250, 54, '#ffe14a');
          ['CONTINUAR', 'SANGRE: ' + SANGRE_TXT[SANGRE], 'SALIR AL MENÚ'].forEach((o, i) => opcion(o, W / 2, 330 + i * 52, S.pauseSel === i, S.pauseSel === i ? '#3ddc6a' : '#fff'));
          text(TOUCH ? 'Toca una opción' : 'Arriba / abajo y ENTER   -   ESC: seguir jugando', W / 2, 600, 12, '#ccc');
          if (S.mode === 'arcade' && (S.decretos || []).length) wrap('DECRETOS: ' + S.decretos.map(decNombre).join(' · '), W / 2, 640, 9, '#ffe14a', W - 200, 20);
        }
        if (S.mode === 'online') {
          if (NET.wait > 20) text('ESPERANDO AL RIVAL...', W / 2, 200, 16, '#ffe14a');
          if (NET.rtt) text('PING ' + Math.round(NET.rtt) + ' MS', W / 2, 700, 8, NET.rtt < 80 ? '#3ddc6a' : NET.rtt < 160 ? '#ffe14a' : '#ff3b30');
          if (NET.desync) text('AVISO: LA PARTIDA SE HA DESINCRONIZADO', W / 2, 230, 11, '#ff3b30');
        }
      },
    },
    result: {
      update(m) {
        const r = S.result;
        if (S.t === 1) { Sound.play('heal'); if (r.p1won || S.mode === 'versus' || S.mode === 'online') Sound.voice('victoria'); }
        // tras perder en arcade (o en versus) se elige: seguir con los mismos, cambiar de personajes o salir
        const loco = ['legislatura', 'mocion', 'cumbre', 'caos', 'libre'].includes(S.mode), conf = S.vs.conflicto;
        if (S.t === 1 && S.mode === 'legislatura' && !r.p1won) { let mx = 0; try { mx = +localStorage.getItem('mf_legislatura') || 0; } catch (e) { } S.legRecord = Math.max(mx, S.legN); try { localStorage.setItem('mf_legislatura', S.legRecord); } catch (e) { } }
        const opts = S.vs.reto || conf || S.mode === 'diario' ? null : (S.mode === 'arcade' || loco) && !r.p1won ? ['CONTINUAR CON LOS MISMOS', 'CAMBIAR DE PERSONAJES', 'SALIR AL MENÚ'] : S.mode === 'versus' ? ['REVANCHA', 'CAMBIAR DE PERSONAJES', 'SALIR AL MENÚ'] : null;
        if (S.t === 1) { S.resOpts = opts; S.resSel = 0; if ((S.vs.reto || conf) && r.p1won) { S.confNuevo = !Unlock.has(S.vs.b); Unlock.add(S.vs.b.id); }
          logrosCombate(); if (conf && r.p1won) Logros.ganar('conflicto');
          if (S.mode === 'arcade' && r.p1won && !S.vs.reto) jefeRegional();
          if (S.mode === 'arcade' && !S.vs.reto && S.match) { const M = S.match, yo = M.f[0]; if (r.p1won) popSuma(4 + Math.min(4, (yo.perfectos || 0) * 2) + (M.fin && M.fin.on && M.fin.kind === 'indulto' ? 3 : M.remate ? -2 : 0), 'VICTORIA'); else popSuma(-4, 'DERROTA'); }
          if (S.mode === 'diario') { const D = diaRecord(); D.intentos = (D.intentos || 0) + 1; S.diaRes = null;
            if (r.p1won) { const sg = Math.round(S.diaT / 6) / 10; S.diaRes = { sg, nuevo: !D.best || sg < D.best }; if (S.diaRes.nuevo) D.best = sg; Logros.ganar('diario'); }
            guardar('mf_diario', D); } } // se guarda ya: aunque cierres la pestaña, lo has ganado
        if (opts && (m.u || m.d)) { S.resSel = (S.resSel + (m.d ? 1 : opts.length - 1)) % opts.length; Sound.play('blip'); }
        if (m.ok && S.t > 50) {
          Sound.play('ok'); const pick = opts ? S.resSel : 0;
          if (opts && pick === 2) { Sound.music('menu'); go('mode'); return; }
          if (opts && pick === 1) { resetPicks(); S.keepRun = S.mode === 'arcade'; Sound.music('menu'); go('select'); return; }
          if (S.vs.reto) { S.reto = null; S.vs.reto = false; if (r.p1won) { S.unl = [S.vs.b]; S.unlReto = true; Sound.voice('nombre_' + S.vs.b.id); go('unlocked'); } else { S.retosLeft = 0; Sound.music('moncloa'); go('creditos'); } return; }
          if (S.mode === 'lab') { Sound.music('menu'); go('lab'); return; }
          if (conf) { if (r.p1won && S.confNuevo) { S.unl = [S.vs.b]; S.unlConf = true; Sound.voice('nombre_' + S.vs.b.id); go('unlocked'); } else { Sound.music('menu'); go('conflictos'); } return; }
          if (S.mode === 'diario') { Sound.music('menu'); go('diario'); return; }
          if (S.mode === 'libre') { if (r.p1won) { S.libre.n++; if (S.libre.n >= S.libre.L.length) { Logros.ganar('libre'); S.toast = '¡ARCADE LIBRE COMPLETADO!'; S.toastT = 240; Sound.music('menu'); go('mode'); return; } Sound.music('menu'); go('escalera'); } else libreVs(); return; }
          if (S.mode === 'legislatura') { if (r.p1won) { S.legN++; S.legHp = Math.min(1, (S.legFin || 1) + 0.25); legSiguiente(); } else { S.legN = 0; S.legHp = 1; legSiguiente(); } return; }
          if (S.mode === 'mocion') { if (r.p1won) { Sound.music('menu'); go('mode'); } else mocionEmpieza(); return; }
          if (S.mode === 'caos') { caosSiguiente(); return; }
          if (S.mode === 'cumbre') { if (r.p1won) { S.cumbreN++; if (S.cumbreN >= S.cumbre.length) { S.toast = '¡LÍDER MUNDIAL! HAS GANADO LA CUMBRE'; S.toastT = 240; Sound.music('menu'); go('mode'); return; } } cumbreSiguiente(); return; }
          if (S.mode === 'versus') { S.vs.label = 'REVANCHA'; go('vs'); }
          else if (S.mode === 'online') { if (!NET.ch) { go('net'); return; } resetPicks(); NET.mine = NET.theirs = null; Sound.music('menu'); go('select'); }
          else if (r.p1won) { S.step++; if (S.step >= S.ladder.length) { finHistoria(); S.unlockedNow = Array.from({ length: DIF_PREMIO[S.dif] || 0 }, () => Unlock.next()).filter(Boolean); S.retosLeft = DIF_RETOS[S.dif] || 0; S.retosVistos = []; startEnding(FIGHTERS[S.sel[0]], FIGHTERS[S.asel[0]]); } else if (bonusToca()) bonusAnuncia(); else trasVictoria(); }
          else startArcadeFight();
        }
        if (m.back) { if (S.mode === 'online') { NET.st = 'menu'; netClose(); } if (conf) { Sound.music('menu'); go('conflictos'); return; } if (S.mode === 'diario') { Sound.music('menu'); go('diario'); return; } if (S.vs.reto) { S.reto = null; S.vs.reto = false; S.retosLeft = 0; Sound.music('moncloa'); go('creditos'); return; } Sound.music('menu'); go('mode'); }
      },
      draw() {
        const r = S.result, w = r.winner; drawStage(S.vs.stage, (STAGE_W - W) / 2, 0.7);
        sprite(w.id, r.beaten ? 'win_x' : 'win', 330, 660, 560 / META[w.id].idle.h * (w.height / 400), 1);
        const lost = S.mode === 'online' ? r.p1won !== (NET.role === 'host') : (['arcade', 'libre', 'diario'].includes(S.mode) || S.vs.conflicto) && !r.p1won;
        text(lost ? 'HAS PERDIDO' : '¡VICTORIA!', 830, 130, 44, !lost ? '#ffe14a' : '#ff3b30');
        if (S.mode === 'legislatura') text(lost ? `LEGISLATURA: ${S.legN} COMBATES · RÉCORD: ${S.legRecord || S.legN}` : `COMBATES GANADOS: ${S.legN + 1}`, 830, 175, 13, '#ffe14a');
        if (S.mode === 'mocion' && !lost) text('¡MOCIÓN DE CENSURA SUPERADA!', 830, 175, 13, '#ffe14a');
        if (S.mode === 'arcade' && !S.vs.reto && !(TOUCH && S.resOpts)) popBarra(680, 432, 300);
        text(w.name, 830, 215, 26, '#fff'); wrap('"' + w.quote + '"', 830, TOUCH && S.resOpts ? 285 : 310, 15, '#fff', 720, TOUCH && S.resOpts ? 30 : 34);
        if (S.resOpts && TOUCH) S.resOpts.forEach((o, i) => { // móvil: tres botones grandes; un toque elige directamente
          const on = S.resSel === i, bw = 640, bh = 74, x = 830 - bw / 2, y = 432 + i * 92, col = ['#3ddc6a', '#39d0ff', '#ff7a3c'][i];
          pxCaja(x + 6, y + 8, bw, bh, 4, 'rgba(0,0,0,0.5)'); pxCaja(x, y, bw, bh, 4, on ? '#ffe14a' : col); pxCaja(x + 5, y + 5, bw - 10, bh - 10, 4, on ? '#2a1808' : 'rgba(12,8,24,0.94)');
          text(o, 830, y + bh / 2, 22, on ? '#ffe14a' : '#fff', 'center', '#0c0614');
          zona(x, y, bw, bh, () => { S.resSel = i; pressed.add('Enter'); });
        });
        else if (S.resOpts) S.resOpts.forEach((o, i) => opcion(o, 830, 520 + i * 40, S.resSel === i, S.resSel === i ? '#3ddc6a' : '#fff', 28, 24));
        else if (S.vs.reto) { if (!r.p1won) wrap('El reto se ha terminado. Para volver a intentarlo tendrás que llegar otra vez a la Moncloa.', 830, 520, 13, '#ffb3ad', 700, 28); else text('¡HAS CONSEGUIDO UN PERSONAJE SECRETO!', 830, 540, 15, '#3ddc6a'); text('ENTER', 830, 640, 13, '#ccc'); }
        else if (S.vs.conflicto) { text(r.p1won ? (S.confNuevo ? '¡HAS CONSEGUIDO UN PRESIDENTE EXTRANJERO!' : '¡CONFLICTO RESUELTO OTRA VEZ!') : 'Puedes volver a intentarlo cuando quieras.', 830, 540, 14, r.p1won ? '#3ddc6a' : '#ffb3ad'); text('ENTER', 830, 640, 13, '#ccc'); }
        else if (S.mode === 'diario') { const D = diaRecord(); if (S.diaRes) { text('TIEMPO: ' + S.diaRes.sg + ' s', 830, 520, 22, '#ffe14a'); text(S.diaRes.nuevo ? '¡NUEVO RÉCORD DE HOY!' : 'TU RÉCORD DE HOY: ' + D.best + ' s', 830, 566, 13, S.diaRes.nuevo ? '#3ddc6a' : '#fff'); } else text('Inténtalo otra vez: el reto dura todo el día.', 830, 540, 13, '#ffb3ad'); text('ENTER', 830, 640, 13, '#ccc'); }
        else text(TOUCH ? 'TOCA PARA SEGUIR' : S.mode === 'arcade' || S.mode === 'libre' ? 'ENTER: siguiente combate' : 'ENTER: otra vez   ESC: menú', 830, 640, TOUCH ? 18 : 13, '#ccc');
      },
    },
    // final del arcade: 1) el nuevo presidente llega andando a la Moncloa con su aliado, 2) ilustración de su entrada, 3) moraleja
    ending: {
      update(m) {
        const E = S.end; if (!E) return;
        if (S.t === 2) Sound.voice('nombre_' + E.f.id);
        if (S.t % 5 === 0) for (let i = 0; i < 3; i++) E.conf.push({ x: rand(0, W), y: -10, vx: rand(-1, 1), vy: rand(2, 5), r: rand(0, 6), c: ['#ffe14a', '#e30613', '#fff', '#39d0ff', '#3ddc6a'][Math.floor(rand(0, 5))] });
        E.conf.forEach(c => { c.x += c.vx + Math.sin((S.t + c.y) * 0.05); c.y += c.vy; c.r += 0.2; }); E.conf = E.conf.filter(c => c.y < H + 10);
        if (Math.random() < 0.12) E.flash.push({ x: rand(40, W - 40), y: rand(430, 560), t: 0 }); E.flash = E.flash.filter(q => ++q.t < 9);
        if (S.t === 880 && !S.retosLeft) { go('creditos'); return; } // en FÁCIL se acaba aquí: el conflicto internacional es el premio de MEDIO o más
        if (S.t === 880) { Sound.stopMusic(); Sound.voice('telefono'); E.ring = 880; }
        if (S.t > 900 && !E.coge && (S.t - E.ring) >= 240) { E.ring = S.t; Sound.voice('telefono'); }
        if (m.ok && S.t > 40 && !E.coge) { if (S.t < 330) S.t = 330; else if (S.t < 880) S.t = 879; else if (S.t > 930) { E.coge = S.t; Sound.voice('diga'); } }
        if (S.t > 1500 && !E.coge) { E.coge = S.t; Sound.voice('diga'); } // si nadie lo coge, lo coge el jefe de gabinete
        if (E.coge && S.t === E.coge + 50) Sound.voice('conflicto');
        if (E.coge && S.t > E.coge + 170) startReto();
      },
      draw() {
        const E = S.end, f = E.f, al = E.al, t = S.t, pres = (window.PRESIDENTAS || []).includes(f.id) ? 'PRESIDENTA' : 'PRESIDENTE';
        const walkers = () => {
          // velocidad constante y frenada suave al final; el fotograma sale de la distancia andada, así los pies no resbalan
          const arrive = 215, v = 4.3, x0 = W / 2 - v * (arrive - 18), tt = t < arrive - 36 ? t : arrive - 36 + (arrive - 36 > t ? 0 : (() => { const q = Math.min(36, t - (arrive - 36)) / 36; return 36 * (q - q * q / 2); })()), x = x0 + v * tt, walking = t < arrive;
          const draw = (d, px, k) => { const nw = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'].filter(p => META[d.id][p]), wf = nw.length >= 6 ? nw : ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'].filter(p => META[d.id][p]), hh = d.height * k, paso = hh * 0.095; const p = walking ? (wf.length >= 3 ? wf[Math.floor(v * tt / paso) % wf.length] : (Math.floor(t / 9) % 2 ? 'walk' : 'idle')) : (t < arrive + 14 ? 'idle' : 'win');
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(px, GROUND - 2, 70 * k, 12, 0, 0, 7); ctx.fill(); sprite(d.id, p, px, GROUND, k * d.height / META[d.id].idle.h, 1); };
          if (al) draw(al, x - 190, 0.86); draw(f, x, 1);
        };
        if (t < 360) { // llegada
          drawStage('moncloa', (STAGE_W - W) / 2, 0.12, true);
          ctx.fillStyle = '#b3121f'; ctx.fillRect(0, GROUND - 6, W, 44); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, GROUND - 6, W, 4);
          walkers();
          for (const q of E.flash) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - q.t / 9; const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 70); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(q.x - 70, q.y - 70, 140, 140); ctx.restore(); }
          text('EL NUEVO INQUILINO DE LA MONCLOA', W / 2, 70, 22, '#fff');
          if (t > 250) { const pop = 1 + Math.max(0, 262 - t) * 0.04; ctx.save(); ctx.translate(W / 2, 150); ctx.scale(pop, pop); text('¡' + f.name + '!', 0, 0, 38, '#ffe14a', 'center', '#7a0d0d'); ctx.restore(); }
        }
        if (t >= 330) { // ilustración de la entrada
          const im = E.img, a = Math.min(1, (t - 330) / 30); ctx.globalAlpha = a;
          if (im.complete && im.naturalWidth) { const h = W * im.naturalHeight / im.naturalWidth; ctx.imageSmoothingEnabled = false; const z = 1 + Math.min(570, t - 330) * 0.00016; ctx.save(); ctx.translate(W / 2, H * 0.42); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.42); ctx.drawImage(im, 0, Math.round((H - h) / 2), W, h); ctx.restore(); } // pixel art: a su tamaño exacto
          else { bg('moncloa', 0.3); sprite(f.id, 'win', W / 2, 690, 470 / META[f.id].idle.h * (f.height / 400), 1); }
          const g = ctx.createLinearGradient(0, H - 250, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.78)'); g.addColorStop(1, 'rgba(0,0,0,0.92)'); ctx.fillStyle = g; ctx.fillRect(0, H - 250, W, 250);
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 34);
          if (E.gob && t > 380) { const G = E.gob, tw = txtAncho(G.t, 18) + 64, sub = G.d + '  ·  POPULARIDAD ' + G.p + '%', sw = txtAncho(sub, 10) + 40; pr(W / 2 - sw / 2, 92, sw, 30, 'rgba(10,8,18,0.86)'); pxCaja(W / 2 - tw / 2, 46, tw, 40, 4, '#0c0614'); pxCaja(W / 2 - tw / 2 + 4, 50, tw - 8, 32, 4, G.p >= 60 ? '#178a3c' : G.p >= 35 ? '#8a6a10' : '#8f0f19'); text(G.t, W / 2, 66, 18, '#fff', 'center', '#0c0614'); text(sub, W / 2, 107, 10, '#ffe14a', 'center', '#000'); }
          text(f.name, W / 2, H - 150, 34, '#ffe14a', 'center', '#7a0d0d'); text(pres + ' DEL GOBIERNO', W / 2, H - 112, 16, '#fff');
          if (t > 420) wrap(window.ENDINGS[f.id] || '', W / 2, H - 78, 12, '#fff', 1080, 22);
          if (al && t > 520) text('Vicepresidencia: ' + al.name, W / 2, H - 22, 10, '#3ddc6a');
          ctx.globalAlpha = 1;
        }
        for (const c of E.conf) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-5, -3, 10, 6); ctx.restore(); }
        (S.unlockedNow || []).forEach((u, i) => { if (t > 520 && t < 880) { const yy = 48 + i * 120; ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(W - 400, yy, 380, 110); ctx.drawImage(IMG[u.id + '/face'], W - 390, yy + 10, 90, 90); text('¡DESBLOQUEADO!', W - 195, yy + 42, 11, '#3ddc6a'); text(u.name, W - 195, yy + 77, 10, '#fff'); } });
        if (t >= 880) { // suena el teléfono rojo: el conflicto internacional
          const sh = E.coge ? 0 : (Math.floor(t / 3) % 2 ? 6 : -6), a = Math.min(1, (t - 880) / 12), fr = E.telf || [], n = fr.filter(i => i.complete && i.naturalWidth).length;
          ctx.globalAlpha = a; ctx.fillStyle = '#000'; ctx.fillRect(-OX, 0, VW, H);
          const im = n > 2 && !E.coge ? fr[Math.floor(t / 4) % n] : E.tel, ih = im && im.naturalWidth ? W * im.naturalHeight / im.naturalWidth : 0;
          if (ih) ctx.drawImage(im, sh, Math.round((H - ih) / 2), W, ih);
          const on = Math.floor(t / 16) % 2; if (!E.coge) { ctx.fillStyle = `rgba(255,0,0,${on ? 0.16 : 0.03})`; ctx.fillRect(-OX, 0, VW, H); }
          if (!E.coge) { if (on) text('¡RIIIIING!', W / 2 + sh, 110, 46, '#ff3b30', 'center', '#fff'); if (t > 930 && Math.floor(t / 30) % 2) text('ENTER: COGER EL TELÉFONO', W / 2, H - 50, 16); }
          else { text('¿DIGA?', W / 2, 110, 40, '#fff', 'center', '#000'); if (t > E.coge + 50) { const pop = 1 + Math.max(0, E.coge + 62 - t) * 0.06; ctx.save(); ctx.translate(W / 2, H - 110); ctx.scale(pop, pop); text('¡CONFLICTO INTERNACIONAL!', 0, 0, 34, '#ffe14a', 'center', '#7a0d0d'); ctx.restore(); } }
          ctx.globalAlpha = 1;
        } else if (t > 60 && Math.floor(t / 40) % 2) text('ENTER para continuar', W - 150, H - 8, 8, '#bbb');
      },
    },
  };

  // ---------- pantallas del replanteo (9/11/2026) ----------
  Object.assign(SCREENS, {
    // fin de las primarias
    // FASE DE BONUS: cartel de antes (intro) y cuenta de después (fin)
    bonus: {
      update(m) {
        if (S.bonusFase === 'intro') { if (S.t === 1) Sound.play('super'); if ((m.ok && S.t > 30) || S.t > 420) { Sound.play('ok'); empiezaBonus(); } }
        else { if (S.t === 1) Sound.play('heal'); if ((m.ok && S.t > 60) || S.t > 480) { Sound.play('ok'); Sound.music('menu'); trasVictoria(); } }
      },
      draw() {
        const t = S.t, me = FIGHTERS[S.sel[0]], fin = S.bonusFase !== 'intro', R = S.bonusRes;
        bg('hacienda', 0.6);
        sprite(me.id, fin && R && R.pct >= 50 ? 'win' : 'idle', 250, 690, 470 / META[me.id].idle.h * (me.height / 400), 1);
        const pop = 1 + Math.max(0, 14 - t) * 0.05; ctx.save(); ctx.translate(790, 120); ctx.scale(pop, pop); text('FASE DE BONUS', 0, 0, 40, '#ffe14a', 'center', '#7a0d0d'); ctx.restore();
        const cx = 790, bx = cx - 330, bw = 660;
        if (!fin) { // los párrafos van uno detrás de otro según las líneas que ocupen (en móvil la letra es más grande) y la caja crece con ellos
          const P = [['Llega el traspaso de poderes y el despacho está hasta arriba. Tienes ' + BONUS_T + ' segundos para no dejar ni una carpeta.', 12, '#ddd'], ['Puños, patadas, especiales y súper: todo vale. Cuanto más limpio, más popularidad.', 11, '#ffe14a'], ['Al 100 %: el próximo combate empiezas con el súper lleno.', 10, '#3ddc6a']]
            .map(([s, z, c]) => { const lh = Math.max(22, tam(z) + 12); return { s, z, c, lh, alto: wrapLines(s, z, bw - 80).length * lh }; });
          const alto = 96 + P.reduce((q, p) => q + p.alto + 14, 0), y0 = Math.max(170, 340 - alto / 2);
          pxCaja(bx, y0, bw, alto, 4, '#ffe14a'); pxCaja(bx + 6, y0 + 6, bw - 12, alto - 12, 4, '#141022');
          text('LIMPIEZA DE DESPACHO', cx, y0 + 46, ajusta('LIMPIEZA DE DESPACHO', 22, bw - 60), '#fff');
          let y = y0 + 98; for (const p of P) { wrap(p.s, cx, y, p.z, p.c, bw - 80, p.lh); y += p.alto + 14; }
          if (t > 30 && Math.floor(t / 30) % 2) text(TOUCH ? 'TOCA PARA EMPEZAR' : 'ENTER: ¡A LIMPIAR!', cx, Math.max(560, y0 + alto + 50), 16);
        } else if (R) {
          pxCaja(bx, 190, bw, 300, 4, '#3ddc6a'); pxCaja(bx + 6, 196, bw - 12, 288, 4, '#141022');
          text(R.pct >= 100 ? '¡DESPACHO LIMPIO!' : 'SE ACABÓ EL TIEMPO', cx, 236, 20, R.pct >= 100 ? '#3ddc6a' : '#ff9d2e');
          const n = Math.min(R.pct, Math.round(t * 2.2)); text(n + '%', cx, 312, 54, '#fff', 'center', '#000'); text('DEL DESPACHO, LIMPIO', cx, 362, 12, '#ccc');
          if (t > 50) text(R.pop ? 'POPULARIDAD +' + R.pop : 'NI UN VOTO MÁS', cx, 412, 14, R.pop ? '#3ddc6a' : '#ff6b5e');
          if (t > 70 && R.super) text('PRÓXIMO COMBATE: SÚPER LLENO', cx, 452, 11, '#39d0ff');
          if (t > 60) popBarra(cx - 160, 520, 320);
          if (t > 60 && Math.floor(t / 30) % 2) text(TOUCH ? 'TOCA PARA SEGUIR' : 'ENTER: SEGUIR', cx, 640, 14);
        }
      },
    },
    candidato: {
      update(m) { if (S.t === 1) { Sound.play('super'); Logros.ganar('primarias'); } if (m.ok && S.t > 40) { Sound.play('ok'); startArcadeFight(); } },
      draw() {
        const me = FIGHTERS[S.sel[0]], u = S.candUnl, t = S.t, st = (S.route[S.step - 1] || S.route[S.step]).stage;
        bg(st, 0.55);
        sprite(me.id, 'win', 280, 690, 520 / META[me.id].idle.h * (me.height / 400), 1);
        const pop = 1 + Math.max(0, 16 - t) * 0.05; ctx.save(); ctx.translate(800, 140); ctx.scale(pop, pop); text('¡ERES EL CANDIDATO!', 0, 0, 34, '#ffe14a', 'center', '#7a0d0d'); ctx.restore();
        wrap('Has ganado las primarias. Ahora, campaña por España: después de cada combate eliges la siguiente ciudad. Al final, Madrid y La Moncloa.', 800, 220, 13, '#fff', 700, 28);
        if (u && t > 40) {
          pxCaja(560, 330, 480, 180, 4, '#3ddc6a'); pxCaja(566, 336, 468, 168, 4, '#141022'); cara(u, 588, 362, 116);
          text('SE UNE A TU CAMPAÑA', 870, 380, 12, '#3ddc6a'); wrap(u.name, 870, 426, 15, '#fff', 300, 26); text('NUEVO PERSONAJE', 870, 482, 10, '#ffe14a');
        }
        if (t > 40 && Math.floor(t / 30) % 2) text('ENTER: ¡A LA CAMPAÑA!', 800, 640, 16);
      },
    },
    // campaña: eliges entre dos ciudades (a veces con parada especial)
    rumbo: {
      update(m) {
        const O = S.rumbo || []; if (!O.length) { S.rumbo = null; if (S.camp) S.camp.left = 0; startArcadeFight(); return; }
        if (m.l || m.u) { S.rumboSel = (S.rumboSel + O.length - 1) % O.length; Sound.play('blip'); }
        if (m.r || m.d) { S.rumboSel = (S.rumboSel + 1) % O.length; Sound.play('blip'); }
        if (m.ok && S.t > 20) { Sound.play('ok'); elegirRumbo(O[S.rumboSel]); }
      },
      draw() {
        const O = S.rumbo || [], C = S.camp, R = S.route, t = S.t, im = IMG['ui/mapa_espana'];
        ctx.fillStyle = '#1a1420'; ctx.fillRect(-OX, 0, VW, H);
        // el mapa, algo más pequeño y arriba: debajo van las dos tarjetas sin tapar ninguna ciudad
        const ih = im && im.naturalWidth ? W * im.naturalHeight / im.naturalWidth : H, k = Math.min(0.8, (H - 64 - 118) / ih); ctx.save(); ctx.translate((W - W * k) / 2, 64 - k * (H - ih) / 2); ctx.scale(k, k);
        if (im && im.complete && im.naturalWidth) ctx.drawImage(im, 0, (H - ih) / 2, W, ih);
        const hechas = R.slice(0, S.step).filter(r => r.fase === 'campana'), aqui = hechas[hechas.length - 1];
        const linea = (a, b, col, punteado) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineWidth = 9; ctx.strokeStyle = '#1a1420'; ctx.setLineDash(punteado ? [5, 13] : []); ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = col; ctx.stroke(); ctx.setLineDash([]); };
        const punto = (x, y, r, col) => { ctx.beginPath(); ctx.arc(x, y, r + 4, 0, 7); ctx.fillStyle = '#1a1420'; ctx.fill(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = col; ctx.fill(); };
        const rotulo = (s, x, y, sz, col) => { const tw = txtAncho(s, sz) + 16, lx = clamp(x, tw / 2 + 24, W - tw / 2 - 24); ctx.fillStyle = 'rgba(16,12,26,0.85)'; ctx.fillRect(lx - tw / 2, y - sz - 2, tw, sz * 2 + 4); text(s, lx, y, sz, col); };
        for (let i = 1; i < hechas.length; i++) linea(hechas[i - 1], hechas[i], '#e30613');
        O.forEach((o, i) => { if (aqui) linea(aqui, o.c, i === S.rumboSel ? '#ffe14a' : '#fff', true); });
        hechas.forEach(r => { punto(r.x, r.y, 11, '#3ddc6a'); rotulo(r.ciudad || '', r.x, r.y - 26, 9, '#bfe8c8'); });
        O.forEach((o, i) => { const on = i === S.rumboSel; punto(o.c.x, o.c.y, on ? 16 + Math.sin(t * 0.2) * 3 : 12, on ? '#ffe14a' : '#fff'); rotulo((i ? 'B: ' : 'A: ') + o.c.n, o.c.x, o.c.y - 30, on ? 12 : 10, on ? '#ffe14a' : '#fff'); });
        if (aqui) { const me = FIGHTERS[S.sel[0]]; pr(aqui.x - 27, aqui.y + 18, 54, 54, '#ff3b30'); pr(aqui.x - 24, aqui.y + 21, 48, 48, me.color); const fi = IMG[me.id + '/face']; if (fi && fi.complete) ctx.drawImage(fi, aqui.x - 24, aqui.y + 21, 48, 48); }
        ctx.restore();
        pr(0, 0, W, 64, 'rgba(10,8,18,0.88)'); text('CAMPAÑA: ELIGE TU PRÓXIMO DESTINO', W / 2, 24, 20, '#ffe14a');
        text(C.left === 1 ? 'ÚLTIMA CIUDAD DE CAMPAÑA ANTES DE MADRID' : 'QUEDAN ' + C.left + ' CIUDADES DE CAMPAÑA ANTES DE MADRID', W / 2, 50, 10, '#fff');
        const w = 460, h = 108, gap = 40, x0 = W / 2 - (O.length * w + (O.length - 1) * gap) / 2, y = H - h - 8;
        O.forEach((o, i) => {
          const x = x0 + i * (w + gap), on = i === S.rumboSel, E = o.especial && ESPECIALES[o.especial];
          cartel(x, y, w, h, E ? E.col : '#2a5fc0', '#0c0614', on, null, null);
          text((i ? 'B: ' : 'A: ') + o.c.n, x + w / 2, y + 34, 18, on ? '#fff' : '#a9aec4', 'center', '#0c0614');
          if (E) { text('PARADA ESPECIAL: ' + E.n, x + w / 2, y + 62, 11, on ? '#ffe14a' : '#ddd', 'center', '#0c0614'); text(E.d, x + w / 2, y + 84, 8, '#fff', 'center', '#0c0614'); }
          else text('Combate de campaña, sin sorpresas', x + w / 2, y + 68, 10, on ? '#fff' : '#bbb', 'center', '#0c0614');
          zona(x, y, w, h, () => { S.rumboSel = i; pressed.add('Enter'); });
        });
      },
    },
    // CONFLICTOS INTERNACIONALES: elige contra quién (los que aún no tienes salen en silueta)
    conflictos: {
      update(m) {
        const L = confLista(), n = L.length, cols = Math.min(8, Math.max(1, n)); if (S.toastT > 0) S.toastT--;
        if (m.back) { Sound.music('menu'); go('mode'); return; } if (!n) { if (m.ok) go('mode'); return; }
        S.confSel = Math.min(S.confSel || 0, n - 1);
        if (m.l) { S.confSel = (S.confSel + n - 1) % n; Sound.play('blip'); } if (m.r) { S.confSel = (S.confSel + 1) % n; Sound.play('blip'); }
        if (m.u && S.confSel - cols >= 0) { S.confSel -= cols; Sound.play('blip'); } if (m.d && S.confSel + cols < n) { S.confSel += cols; Sound.play('blip'); }
        if (m.ok && S.t > 15) confLucha(L[S.confSel]);
      },
      draw() {
        bg('exteriores', 0.72); const L = confLista(), n = L.length, cols = Math.min(8, Math.max(1, n)), s = 100, gap = 22, x0 = W / 2 - (cols * s + (cols - 1) * gap) / 2, me = FIGHTERS[S.sel[0]];
        if (Math.floor(S.t / 16) % 2 || S.t > 60) { pr(0, 26, W, 54, '#b3121f'); text('CONFLICTOS INTERNACIONALES', W / 2, 54, 24, '#fff', 'center', '#5a0008'); }
        text('CONSEGUIDOS: ' + L.filter(f => Unlock.has(f)).length + ' DE ' + n + '   ·   LUCHAS CON ' + me.name, W / 2, 104, 11, '#ffe14a');
        if (!n) { text('Todavía no hay conflictos abiertos.', W / 2, 360, 14); return; }
        L.forEach((f, i) => {
          const c = i % cols, r = Math.floor(i / cols), x = x0 + c * (s + gap), y = 140 + r * (s + gap), on = i === S.confSel, tiene = Unlock.has(f);
          cara(f, x, y + (on ? -4 : 0), s, !tiene, on ? (Math.floor(S.t / 10) % 2 ? '#ffe14a' : '#fff6b8') : tiene ? '#3ddc6a' : '#3b4058');
          if (!tiene) text('?', x + s / 2, y + s / 2, 30, '#59607a');
          zona(x, y, s, s, () => { if (S.confSel === i) pressed.add('Enter'); else { S.confSel = i; Sound.play('blip'); } });
        });
        const f = L[S.confSel || 0], tiene = Unlock.has(f), y = 140 + Math.ceil(n / cols) * (s + gap) + 20;
        pr(120, y, W - 240, 150, 'rgba(0,0,0,0.65)');
        if (tiene) { text(f.name, W / 2, y + 30, 20, '#ffe14a', 'center', '#7a0d0d'); wrap((window.RETOS || {})[f.id] || f.title, W / 2, y + 70, 11, '#fff', W - 320, 22); text('YA ES TUYO: ESTA VEZ ES POR EL HONOR', W / 2, y + 130, 10, '#3ddc6a'); }
        else { text('?????', W / 2, y + 30, 20, '#888'); wrap('Un conflicto internacional te espera. Un solo combate, sin aliados. Si ganas, este presidente es tuyo.', W / 2, y + 74, 12, '#fff', W - 320, 24); }
        text(TOUCH ? 'Toca un retrato · tócalo otra vez para luchar' : 'Flechas para elegir · ENTER: ¡A PUÑETAZOS! · ESC: volver', W / 2, 690, 11, '#ccc');
      },
    },
    // ARCADE LIBRE: la torre de rivales
    escalera: {
      update(m) { if (m.ok && S.t > 20) { Sound.play('ok'); libreVs(); } if (m.back) { Sound.music('menu'); go('mode'); } },
      draw() {
        bg('congreso', 0.72); const Lb = S.libre, L = Lb.L, me = FIGHTERS[S.sel[0]], s = 58, gap = 12, tx = 760, t = S.t;
        text('ARCADE LIBRE', 330, 70, 30, '#ffe14a', 'center', '#7a0d0d'); text('COMBATE ' + (Lb.n + 1) + ' DE ' + L.length, 330, 112, 13, '#fff');
        sprite(me.id, 'idle', 330, 660, 420 / META[me.id].idle.h * (me.height / 400), 1);
        L.forEach((f, j) => {
          const y = 650 - (j + 1) * (s + gap) + gap, done = j < Lb.n, now = j === Lb.n;
          pr(tx - 20, y - 6, 440, s + 12, now ? 'rgba(255,225,74,0.22)' : 'rgba(0,0,0,0.55)');
          cara(f, tx, y, s, false, now ? (Math.floor(t / 10) % 2 ? '#ffe14a' : '#fff6b8') : done ? '#3ddc6a' : '#3b4058');
          if (done) { ctx.globalAlpha = 0.55; pr(tx, y, s, s, '#0c0614'); ctx.globalAlpha = 1; }
          text((j + 1) + '. ' + f.name, tx + s + 20, y + s / 2, now ? 12 : 10, now ? '#ffe14a' : done ? '#3ddc6a' : '#ddd', 'left');
          if (done) text('GANADO', tx + 400, y + s / 2, 9, '#3ddc6a', 'right');
          if (now) text('>', tx - 34, y + s / 2, 14, '#ffe14a');
        });
        if (t > 20 && Math.floor(t / 30) % 2) text(TOUCH ? 'TOCA: ¡A PELEAR!' : 'ENTER: ¡A PELEAR!   ESC: salir', 330, 700, 13);
      },
    },
    // RETO DIARIO
    diario: {
      update(m) {
        if (S.toastT > 0) S.toastT--; const D = diaRecord(), O = ['JUGAR'].concat(D.best ? ['COMPARTIR MI TIEMPO'] : [], ['VOLVER']);
        S.diaSel = Math.min(S.diaSel || 0, O.length - 1);
        if (m.u || m.l) { S.diaSel = (S.diaSel + O.length - 1) % O.length; Sound.play('blip'); } if (m.d || m.r) { S.diaSel = (S.diaSel + 1) % O.length; Sound.play('blip'); }
        if (m.back) { go('mode'); return; }
        if (m.ok && S.t > 15) { const o = O[S.diaSel]; if (o === 'JUGAR') diaEmpieza(); else if (o === 'VOLVER') go('mode'); else { Sound.play('ok'); compartirDiario(); } }
      },
      draw() {
        const R = S.dia, D = diaRecord(), t = S.t; bg(R.stage, 0.62);
        text('RETO DIARIO', W / 2, 60, 34, '#ffe14a', 'center', '#7a0d0d'); text(R.fecha.split('-').reverse().join('/') + ' · EL MISMO PARA TODO EL MUNDO', W / 2, 102, 11, '#fff');
        sprite(R.a.id, 'idle', 200, 640, 420 / META[R.a.id].idle.h * (R.a.height / 400), 1); sprite(R.b.id, 'idle', W - 200, 640, 420 / META[R.b.id].idle.h * (R.b.height / 400), -1);
        text(R.a.name, 200, 676, 13); text(R.b.name, W - 200, 676, 13); text('VS', W / 2, 152, 30, '#ffe14a', 'center', '#7a0d0d');
        cartel(W / 2 - 270, 190, 540, 150, '#a80f1c', '#3d0410', true, null, null);
        text('REGLA DE HOY', W / 2, 226, 11, '#ffe14a', 'center', '#0c0614'); text(R.regla.n, W / 2, 264, 22, '#fff', 'center', '#0c0614'); text(R.regla.d, W / 2, 304, 11, '#fff', 'center', '#0c0614');
        text('Gana lo antes posible: cuenta el tiempo.', W / 2, 372, 11, '#ddd');
        text(D.best ? `TU MEJOR TIEMPO DE HOY: ${D.best} s  (${D.intentos || 1} ${(D.intentos || 1) === 1 ? 'INTENTO' : 'INTENTOS'})` : 'AÚN NO LO HAS SUPERADO HOY', W / 2, 410, 13, D.best ? '#3ddc6a' : '#9aa');
        const O = ['JUGAR'].concat(D.best ? ['COMPARTIR MI TIEMPO'] : [], ['VOLVER']);
        O.forEach((o, i) => { const y = 470 + i * 50; opcion(o, W / 2, y, S.diaSel === i, S.diaSel === i ? '#fff' : '#9aa', 26, 20); zona(W / 2 - 240, y - 22, 480, 44, () => { S.diaSel = i; pressed.add('Enter'); }); });
        if (S.toastT > 0) text(S.toast, W / 2, 630, 13, '#ffe14a');
      },
    },
    // GALERÍA Y LOGROS: tres pestañas
    galeria: {
      update(m) {
        const tab = S.galTab || 0;
        if (S.galVer) { if ((m.ok || m.back) && S.t > 10) { S.galVer = null; Sound.play('blip'); } return; }
        if (pressed.has('KeyQ') || m.alt || (tab === 0 && (m.l || m.r))) { S.galTab = (tab + (m.l ? 2 : 1)) % 3; S.galSel = 0; Sound.play('blip'); return; }
        if (m.back) { go('mode'); return; }
        if (tab === 0) return;
        const L = galLista(tab), n = L.length, cols = 12; S.galSel = Math.min(S.galSel || 0, n - 1);
        if (m.l) { S.galSel = (S.galSel + n - 1) % n; Sound.play('blip'); } if (m.r) { S.galSel = (S.galSel + 1) % n; Sound.play('blip'); }
        if (m.u && S.galSel - cols >= 0) { S.galSel -= cols; Sound.play('blip'); } if (m.d && S.galSel + cols < n) { S.galSel += cols; Sound.play('blip'); }
        if (m.ok && tab === 1) { const f = L[S.galSel]; if (leer('mf_finales', []).includes(f.id)) { const im = new Image(); im.src = V('assets/ui/final_' + f.id + '.png'); S.galVer = { f, im }; S.t = 0; Sound.play('ok'); } else Sound.play('block'); }
      },
      draw() {
        const tab = S.galTab || 0, t = S.t; bg('senado', 0.82);
        if (S.galVer) {
          const { f, im } = S.galVer; ctx.fillStyle = '#000'; ctx.fillRect(-OX, 0, VW, H);
          if (im.complete && im.naturalWidth) { const h = W * im.naturalHeight / im.naturalWidth; ctx.drawImage(im, 0, Math.round((H - h) / 2), W, h); } else text('CARGANDO...', W / 2, H / 2, 16);
          const g = ctx.createLinearGradient(0, H - 200, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.9)'); ctx.fillStyle = g; ctx.fillRect(0, H - 200, W, 200);
          text(f.name, W / 2, H - 110, 28, '#ffe14a', 'center', '#7a0d0d'); wrap((window.ENDINGS || {})[f.id] || '', W / 2, H - 66, 11, '#fff', 1080, 22); return;
        }
        text('GALERÍA Y LOGROS', W / 2, 40, 28, '#ffe14a');
        ['LOGROS', 'FINALES', 'PERSONAJES'].forEach((s, i) => { const x = W / 2 + (i - 1) * 230, on = i === tab; pr(x - 105, 66, 210, 30, on ? '#ffe14a' : 'rgba(0,0,0,0.6)'); text(s, x, 81, 13, on ? '#1a1420' : '#9aa'); zona(x - 105, 66, 210, 30, () => { S.galTab = i; S.galSel = 0; Sound.play('blip'); }); });
        if (tab === 0) {
          const ya = leer('mf_logros', []);
          text('CONSEGUIDOS: ' + ya.length + ' DE ' + LOGROS.length + '  ·  CADA LOGRO REGALA UN PERSONAJE', W / 2, 120, 11, '#fff');
          LOGROS.forEach((l, i) => {
            const c = i % 2, r = Math.floor(i / 2), x = 90 + c * 560, bh = TMIN > 11 ? 70 : 64, y = 140 + r * (bh + 6), ok = ya.includes(l.id);
            pxCaja(x, y, 540, bh, 4, ok ? '#3ddc6a' : '#3b4058'); pxCaja(x + 4, y + 4, 532, bh - 8, 4, '#141022');
            pr(x + 16, y + 16, 32, 32, ok ? '#3ddc6a' : '#262a3c'); if (ok) { pr(x + 22, y + 32, 6, 6, '#0c0614'); pr(x + 28, y + 36, 6, 6, '#0c0614'); pr(x + 34, y + 24, 6, 12, '#0c0614'); }
            const dl = wrapLines(l.d, 8, 456), dos = dl.length > 1; text(l.n, x + 64, y + (dos ? 17 : 22), 11, ok ? '#ffe14a' : '#9aa', 'left'); dl.slice(0, 2).forEach((d, j) => text(d, x + 64, y + (dos ? 36 + j * 19 : 44), 8, ok ? '#fff' : '#778', 'left')); // en móvil la letra crece: si no cabe, a dos líneas
          });
        } else {
          const L = galLista(tab), n = L.length, cols = 12, s = 62, gap = 10, x0 = W / 2 - (cols * s + (cols - 1) * gap) / 2, fin = leer('mf_finales', []), sel = Math.min(S.galSel || 0, n - 1);
          const visto = f => tab === 1 ? fin.includes(f.id) : Unlock.has(f);
          text(tab === 1 ? 'FINALES VISTOS: ' + L.filter(visto).length + ' DE ' + n : 'PERSONAJES: ' + L.filter(visto).length + ' DE ' + n + (Unlock.pending() ? '  ·  ' + Unlock.pending() + ' POR DESBLOQUEAR' : ''), W / 2, 120, 11, '#fff');
          L.forEach((f, i) => {
            const c = i % cols, r = Math.floor(i / cols), x = x0 + c * (s + gap), y = 144 + r * (s + gap), on = i === sel;
            cara(f, x, y, s, !visto(f), on ? (Math.floor(t / 10) % 2 ? '#ffe14a' : '#fff6b8') : '#0c0614');
            zona(x, y, s, s, () => { if (S.galSel === i && tab === 1) pressed.add('Enter'); else { S.galSel = i; Sound.play('blip'); } });
          });
          const f = L[sel], y = 144 + Math.ceil(n / cols) * (s + gap) + 12; if (!f) return;
          pr(140, y, W - 280, 84, 'rgba(0,0,0,0.65)');
          if (tab === 1) { if (visto(f)) { text(f.name, W / 2, y + 28, 16, '#ffe14a'); text(TOUCH ? 'Toca otra vez para ver su final' : 'ENTER: ver su final', W / 2, y + 60, 10, '#3ddc6a'); } else { text('???', W / 2, y + 28, 16, '#888'); text('Llega a la Moncloa con ' + (Unlock.has(f) ? f.name : 'este personaje') + ' para ver su final', W / 2, y + 60, 10, '#ddd'); } }
          else if (visto(f)) { text(f.name, W / 2, y + 28, 16, '#ffe14a'); text(f.title, W / 2, y + 60, 10, '#fff'); }
          else { text('???', W / 2, y + 22, 16, '#888'); wrap(pista(f), W / 2, y + 52, 9, '#ddd', W - 340, 18); }
        }
        text(TOUCH ? 'Toca una pestaña o un retrato' : 'Q o G: cambiar de pestaña · flechas: elegir · ESC: volver', W / 2, 700, 10, '#ccc');
      },
    },
  });
  // lo que sale en las pestañas de FINALES (solo nacionales: los extranjeros no tienen final) y PERSONAJES
  function galLista(tab) { return FIGHTERS.filter(f => !f.variantOf && !f.vetado && (tab === 2 || (!f.secret && (window.ENDINGS || {})[f.id]))); }

  // ---------- Bucle ----------
  let last = performance.now(), acc = 0;
  function pintaTodo() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (OX) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, H); if (ambOk) { ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 0.5; ctx.drawImage(ambC, 0, 0, VW, H); ctx.globalAlpha = 1; } }
    else ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false; ctx.translate(OX, 0); S.zonas = []; SCREENS[S.screen].draw(); drawAvisos();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (OX && S.t % 3 === 0) { ambX.imageSmoothingEnabled = true; ambX.drawImage(canvas, OX, 0, W, H, 0, 0, 64, 36); ambOk = true; } // fondo difuminado de los márgenes (como el modo ambiente de los vídeos)
  }
  function frame(now) {
    acc += Math.min(100, now - last); last = now;
    while (acc >= 1000 / 60) {
      acc -= 1000 / 60; S.t++;
      if (pressed.has('KeyM') && S.screen !== 'code') Sound.toggleMute();
      SCREENS[S.screen].update(menu()); pressed.clear();
    }
    pintaTodo();
    requestAnimationFrame(frame);
  }
  // step(n): avanza n fotogramas a mano y dibuja (para pruebas automáticas con la pestaña en segundo plano)
  const step = n => { for (let i = 0; i < (n || 1); i++) { S.t++; SCREENS[S.screen].update(menu()); pressed.clear(); } pintaTodo(); };
  window.__game = { txtAncho: (s, z) => txtAncho(s, z), estilo: v => { if (v) ESTILO = v; return ESTILO; }, nImg: () => Object.keys(IMG).length, S, FIGHTERS, Match, go, newRoute, startArcadeFight, trasVictoria, tirarDecretos, beginMatch, held, pressed, startEnding, startReto, ensure, ensureStage, step, NET, netCreate, netJoin, bonusAnuncia, empiezaBonus };
  requestAnimationFrame(frame);
})();
