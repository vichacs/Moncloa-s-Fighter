// Controles táctiles: en móviles y tabletas se dibujan un joystick y los botones encima del juego.
// Simulan las teclas del jugador 1, así que el motor no distingue entre teclado y pantalla.
(function arranca(intento) {
  const G = window.__game; if (!G) { if ((intento || 0) < 50) setTimeout(() => arranca((intento || 0) + 1), 200); return; } // si el juego aún no está listo, se reintenta (un probador vio la primera vez el combate sin mando)
  if (document.getElementById('tc')) return;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
  if (!touch && !/[?&]tactil/.test(location.search)) return;
  const { held, pressed } = G;
  const down = c => { if (!held.has(c)) pressed.add(c); held.add(c); if (window.Sound) Sound.init(); };
  const up = c => held.delete(c);

  const css = document.createElement('style');
  css.textContent = `
  #tc{position:fixed;inset:0;pointer-events:none;z-index:5;user-select:none;-webkit-user-select:none;touch-action:none;font-family:"Press Start 2P",monospace}
  #tc *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  #tc button{font:inherit;padding:0;touch-action:none;cursor:pointer}
  /* mando de combate: solo durante la pelea, pegado a los bordes (en el móvil cae casi entero en las franjas negras) */
  #tc .stick{position:absolute;left:max(6px,env(safe-area-inset-left));bottom:max(8px,env(safe-area-inset-bottom));width:34vh;height:34vh;max-width:170px;max-height:170px;border-radius:50%;background:rgba(255,255,255,.08);border:3px solid rgba(255,255,255,.3);pointer-events:auto}
  #tc .knob{position:absolute;left:50%;top:50%;width:44%;height:44%;margin:-22% 0 0 -22%;border-radius:50%;background:rgba(255,225,74,.7);border:3px solid rgba(0,0,0,.5)}
  #tc .btns{position:absolute;right:max(6px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(2,1fr);gap:1.4vh;pointer-events:auto}
  #tc .btns button{width:14.5vh;height:14.5vh;max-width:72px;max-height:72px;border-radius:50%;border:3px solid rgba(0,0,0,.55);color:#111;font-size:min(1.8vh,9px);line-height:1.2;opacity:.72}
  #tc .btns button.on{opacity:1;transform:scale(.92)}
  #tc .p{background:#ffe14a}#tc .k{background:#ff7a3c}#tc .s{background:#39d0ff}#tc .x{background:#ff3b30;color:#fff!important}#tc .a{background:#3ddc6a}
  /* esquinas de arriba: ATRÁS / PAUSA a la izquierda, sonido y pantalla completa a la derecha (fuera del centro, donde van títulos y opciones) */
  #tc .izq,#tc .der{position:absolute;top:max(6px,env(safe-area-inset-top));display:flex;gap:6px;pointer-events:auto}
  #tc .izq{left:max(6px,env(safe-area-inset-left))}#tc .der{right:max(6px,env(safe-area-inset-right))}#tc.lucha .der{display:none}
  #tc .esq{min-width:44px;height:44px;border-radius:8px;background:rgba(0,0,0,.62);color:#fff;border:2px solid rgba(255,255,255,.45);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:7px;padding:0 6px}
  #tc .esq b{font-size:13px;line-height:1;font-weight:normal;color:#ffe14a}
  #tc .esq svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
  #tc .esq.on{background:#ffe14a;color:#111}#tc .esq.on b{color:#111}
  /* botón de la acción del menú (elegir, luchar), abajo a la derecha */
  #tc .accion{position:absolute;right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));pointer-events:auto;border-radius:10px;border:3px solid #000;background:#ffe14a;color:#111;font-size:9px;padding:10px 12px;box-shadow:0 4px 0 #7a5d00;animation:mfhint .7s ease-in-out infinite alternate}
  #tc .accion:active{transform:translateY(3px);box-shadow:0 1px 0 #7a5d00}
  @keyframes mfhint{to{transform:scale(1.06)}}
  #tc.menu .stick,#tc.menu .btns{display:none}
  #tc .rot{display:none;position:absolute;inset:0;background:#05050b;color:#ffe14a;align-items:center;justify-content:center;text-align:center;font-size:13px;line-height:2;padding:30px;pointer-events:auto}
  #tc .tip{position:absolute;left:50%;bottom:max(6px,env(safe-area-inset-bottom));transform:translateX(-50%);background:rgba(0,0,0,.8);color:#ffe14a;border:2px solid rgba(255,225,74,.6);border-radius:8px;padding:8px 12px;font-size:8px;line-height:1.6;text-align:center;max-width:46vw;pointer-events:auto}
  #tc .code{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:12px;pointer-events:auto;width:min(80vw,520px)}
  #tc .code input{width:100%;font:inherit;font-size:20px;text-align:center;text-transform:uppercase;letter-spacing:3px;padding:14px 10px;background:#000;color:#fff;border:4px solid #ffe14a;border-radius:6px;outline:none;-webkit-user-select:text;user-select:text}
  #tc .code .row{display:flex;gap:12px}
  #tc .code button{border-radius:8px;padding:12px 22px;font-size:12px;border:3px solid rgba(0,0,0,.55);color:#111}
  #tc [hidden]{display:none!important}
  @media (orientation:portrait){#tc .rot{display:flex}}`;
  document.head.appendChild(css);

  const ICO = {
    son: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
    mudo: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6"/></svg>',
    fs: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
  };
  const root = document.createElement('div'); root.id = 'tc'; root.className = 'menu';
  root.innerHTML = `<div class="stick"><div class="knob"></div></div>
  <div class="btns">
    <button class="s" data-k="KeyR">ESP 1</button><button class="s" data-k="KeyT">ESP 2</button>
    <button class="x" data-k="KeyY">SÚPER</button><button class="a" data-k="KeyH">ALIADO</button>
    <button class="p" data-k="KeyF">PUÑO</button><button class="k" data-k="KeyG">PATADA</button>
  </div>
  <div class="izq"><button class="esq atras" data-k="Escape"><b>◀</b><span>ATRÁS</span></button></div>
  <div class="der"><button class="esq son" data-k="KeyM" aria-label="Sonido">${ICO.son}</button><button class="esq fs" hidden aria-label="Pantalla completa">${ICO.fs}</button></div>
  <button class="accion" data-k="KeyF" hidden>ELEGIR</button>
  <div class="tip" hidden>PANTALLA COMPLETA: pulsa COMPARTIR y «AÑADIR A PANTALLA DE INICIO» &nbsp; ✕</div>
  <form class="code" hidden autocomplete="off"><input type="text" inputmode="text" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="go" maxlength="20" placeholder="TOCA AQUÍ" aria-label="Código secreto"><div class="row"><button type="submit" class="p">OK</button><button type="button" class="x">VOLVER</button></div></form>
  <div class="rot">GIRA EL MÓVIL<br>PARA JUGAR</div>`;
  document.body.appendChild(root);
  // los toques sobre los controles no deben contar además como «Enter» (el juego trata cualquier toque en pantalla como Enter)
  root.addEventListener('pointerdown', e => e.stopPropagation());

  root.querySelectorAll('button[data-k]').forEach(b => {
    let k = b.dataset.k; const on = e => { e.preventDefault(); k = b.dataset.k; b.classList.add('on'); down(k); }, off = e => { e.preventDefault(); b.classList.remove('on'); up(k); };
    b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off, { passive: false }); b.addEventListener('touchcancel', off, { passive: false });
    b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off);
  });

  // ---- pantalla completa: quita las barras del navegador, que en horizontal se comen media pantalla
  // Android y iPad: API de pantalla completa (al primer toque y con el botón PANTALLA). iPhone no la permite en webs:
  // allí la única forma es abrir el juego desde la pantalla de inicio (lo explica el aviso de abajo).
  const el = document.documentElement, canFS = !!(el.requestFullscreen || el.webkitRequestFullscreen);
  const standalone = (window.matchMedia && matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) || navigator.standalone === true;
  const inFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const goFS = () => {
    if (inFS() || !canFS) return;
    try {
      const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen();
      const lock = () => { try { const q = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (q && q.catch) q.catch(() => {}); } catch (e) { /* no se puede fijar el giro */ } };
      if (p && p.then) p.then(lock).catch(() => {}); else lock();
    } catch (e) { /* el navegador no lo permite */ }
  };
  if (canFS && !standalone) {
    const fsBtn = root.querySelector('.fs'); fsBtn.hidden = false;
    const tap = e => { e.preventDefault(); e.stopPropagation(); if (inFS()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else goFS(); };
    fsBtn.addEventListener('touchend', tap, { passive: false }); fsBtn.addEventListener('click', tap);
    addEventListener('touchend', function first() { removeEventListener('touchend', first); goFS(); }); // al primer toque, sin tener que buscar el botón
  } else if (!canFS && !standalone) {
    let seen = false; try { seen = localStorage.getItem('mf_tip_fs') === '1'; } catch (e) { /* sin almacenamiento */ }
    const tip = root.querySelector('.tip');
    if (!seen) { tip.hidden = false; const close = e => { e.preventDefault(); tip.hidden = true; try { localStorage.setItem('mf_tip_fs', '1'); } catch (x) { /* sin almacenamiento */ } }; tip.addEventListener('touchend', close, { passive: false }); tip.addEventListener('click', close); }
  }

  // código secreto: un campo de texto de verdad, para que el móvil abra su teclado (el juego no recibe teclas en pantalla táctil)
  const form = root.querySelector('.code'), inp = form.querySelector('input'), clean = v => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
  inp.addEventListener('input', () => { const v = clean(inp.value); inp.value = v; G.S.codeTxt = v; G.S.codeMsg = ''; });
  form.addEventListener('submit', e => { e.preventDefault(); G.S.codeTxt = clean(inp.value); pressed.add('Enter'); });
  form.querySelector('.x').addEventListener('click', e => { e.preventDefault(); inp.blur(); pressed.add('Escape'); });
  setInterval(() => {
    const on = G.S.screen === 'code' || (G.S.screen === 'net' && G.NET && G.NET.st === 'codigo'); // también el código de sala del modo online
    if (on && form.hidden) { form.hidden = false; inp.value = ''; setTimeout(() => { try { inp.focus(); } catch (e) { /* el teclado se abre al tocar la casilla */ } }, 50); }
    else if (!on && !form.hidden) { form.hidden = true; inp.blur(); }
    if (on && !G.S.codeTxt && inp.value) inp.value = ''; // tras un código incorrecto el juego lo vacía
  }, 120);

  // qué se ve en cada pantalla: el mando solo al pelear; en los menús, ATRÁS arriba a la izquierda y, si hace falta, el botón de la acción
  const izq = root.querySelector('.atras'), izqIco = izq.querySelector('b'), izqTxt = izq.querySelector('span'), accion = root.querySelector('.accion'), son = root.querySelector('.son');
  const CON_ATRAS = ['story', 'mode', 'creditos', 'unlocked', 'stats', 'controls', 'velocidad', 'estilo', 'dificultad', 'select', 'net', 'netwait', 'stage', 'lab', 'locos', 'result', 'conflictos', 'escalera', 'diario', 'galeria'], ACCION = { select: ['ELEGIR', 'KeyF'], stage: ['¡A LUCHAR!', 'Enter'] };
  let antes = '';
  const pinta = () => {
    const S = G.S, pelea = S.screen === 'fight' && !S.paused, acc = !pelea && ACCION[S.screen];
    const atras = CON_ATRAS.includes(S.screen) && !(S.screen === 'net' && G.NET && G.NET.st === 'codigo') && !(S.screen === 'select' && S.picked && S.picked[0] && S.apicked && S.apicked[0]);
    const clave = [pelea, S.screen, S.paused, atras, acc && acc[0], window.Sound && Sound.isMuted && Sound.isMuted()].join('|'); if (clave === antes) return; antes = clave;
    root.className = pelea ? 'lucha' : 'menu';
    izq.parentNode.hidden = !(pelea || atras || S.paused);
    if (pelea) { izqIco.textContent = 'II'; izqTxt.textContent = 'PAUSA'; } else if (S.paused) { izqIco.textContent = '▶'; izqTxt.textContent = 'SEGUIR'; } else if (S.screen === 'story') { izqIco.textContent = '▶▶'; izqTxt.textContent = 'SALTAR'; } else { izqIco.textContent = '◀'; izqTxt.textContent = 'ATRÁS'; }
    accion.hidden = !acc; if (acc) { accion.textContent = acc[0]; accion.dataset.k = acc[1]; }
    const mudo = window.Sound && Sound.isMuted && Sound.isMuted(); son.innerHTML = mudo ? ICO.mudo : ICO.son; son.classList.toggle('on', !!mudo);
  };
  pinta(); setInterval(pinta, 150);

  // joystick: ocho direcciones con zona muerta
  const stick = root.querySelector('.stick'), knob = root.querySelector('.knob'), DIRS = { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS' };
  let id = null;
  const set = (x, y) => {
    const r = stick.getBoundingClientRect(), R = r.width / 2, dx = (x - r.left - R) / R, dy = (y - r.top - R) / R, m = Math.hypot(dx, dy), c = m > 1 ? 1 / m : 1;
    knob.style.transform = `translate(${dx * c * R * 0.55}px,${dy * c * R * 0.55}px)`;
    const on = { l: dx < -0.35, r: dx > 0.35, u: dy < -0.45, d: dy > 0.45 };
    for (const k in DIRS) on[k] && m > 0.3 ? down(DIRS[k]) : up(DIRS[k]);
  };
  const release = () => { id = null; knob.style.transform = ''; for (const k in DIRS) up(DIRS[k]); };
  stick.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; id = t.identifier; set(t.clientX, t.clientY); }, { passive: false });
  stick.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === id) set(t.clientX, t.clientY); }, { passive: false });
  const end = e => { for (const t of e.changedTouches) if (t.identifier === id) release(); };
  stick.addEventListener('touchend', end); stick.addEventListener('touchcancel', end);
  let md = false; stick.addEventListener('mousedown', e => { md = true; set(e.clientX, e.clientY); }); addEventListener('mousemove', e => { if (md) set(e.clientX, e.clientY); }); addEventListener('mouseup', () => { if (md) { md = false; release(); } });
})();
