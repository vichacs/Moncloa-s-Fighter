// Efectos de pixel art de Sprite Fusion (https://www.spritefusion.com/pixel-art-vfx)
// MIT License · Copyright (c) 2026 Hugo Duprez. Pasados de TypeScript a JavaScript; cada efecto va en su propio ámbito.
window.SF_VFX = window.SF_VFX || {};
(() => {
// Made by Sprite Fusion, to have full context over VFX, connect to the MCP: https://www.spritefusion.com/mcp
// MIT License
// Copyright (c) 2026 Hugo Duprez
                                                                                                               
                                     
                          
             
             
                
                                            
                   
                
                 
                  
                  
                     
                
                               
                                                                                                   
 
function explosion(o          = {}) {
  const S = o.size ?? 1, RAD = 36 * S, POWER = 0.9 * Math.pow(S, 0.8), EARTH = o.earth ?? 1.6, RING = (o.shockwave ?? 80) * S, SCORCH = (o.scorch ?? 22) * S;
  const R = new Rng(o.seed ?? 1);
  const gr = o.ground ?? o.y ?? 600, groundAt = (x        ) => (typeof gr === "number" ? gr : gr(x));
  const X = o.x ?? 770, G = groundAt(X), Y = o.y ?? G;
  const ps = new Particles(R, groundAt), fx = new Fx(ps), rocks = new Bits(groundAt);
  const ST = stone(o.surface ?? STONE_BODY), gx = X / PX, gy = G / PX, cool = 1.2 + RAD / 28, thick = 2 + RAD / 18;
  const ringCols = [WHITE, PAL.hot, PAL.orange, ST.light, ST.body];
  let t = 0;
  fx.explosion(X, Math.min(Y, G - RAD * 0.3), RAD, POWER, o.fire ?? 0.3);
  o.shake?.(0.6 * Math.min(1.3, Math.sqrt(S)));
  o.ripple?.(X, Y, RAD * 0.5, RAD * 6.5, 0.5 + RAD / 180, 0.14, RAD * 0.6);
  for (let i = 0; i < Math.round(RAD * 0.5); i++) {
    const s = R.sign();
    ps.spawn(PT.SMOKE, X + s * R.range(0, RAD * 0.6), G - R.range(2, 10 + RAD * 0.08), s * R.range(3, 9.5) * RAD, -R.range(4, 30), R.range(1.1, 2.2) + RAD / 80, ST.dust, R.range(4, 7) + RAD / 12, R.range(0, 0.06), BIG);
  }
  for (let i = 0; i < (o.chunks ?? 26) * Math.min(1.5, S); i++) rocks.add(X + R.range(-0.4, 0.4) * RAD, G - 6, R.range(-9, 9) * RAD * 0.4, -R.range(7, 16) * RAD * 1.5, R.range(1.8, 2.6) + RAD / 60, R.range(0, TAU), R.range(-16, 16), R.int(1, 3));
  for (let i = 0; i < Math.round(EARTH * RAD * 2.6); i++) {
    const u = R.range(-1, 1), a = -Math.PI / 2 + u * 0.5, sp = R.range(6, 19) * RAD * (1 - 0.45 * Math.abs(u));
    ps.spawn(PT.GRIT, X + u * 0.25 * RAD, G - 2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1.2, 2.2), R.pick([ST.light, ST.body, ST.body, ST.shade]), R.chance(0.45) ? 2 : 1);
  }
  for (let i = 0; i < Math.round(EARTH * 12); i++) ps.spawn(PT.SMOKE, X + R.range(-0.3, 0.3) * RAD, G - R.range(4, RAD * 0.6), R.range(-30, 30), -R.range(120, 380) * Math.sqrt(S) * EARTH * 0.6, R.range(1.6, 2.8), ST.dust, R.range(5, 9) * Math.sqrt(S) + RAD / 14, R.range(0, 0.15), BIG);
  return {
    update(dt        ) { t += dt; rocks.step(dt, (b, sp) => sp > 200 && fx.dust(b.x, b.y, 3, 0.6, ST.body)); fx.update(dt); ps.update(dt); },
    draw(f       , layer        ) {
      const buf = new Px(f, f.color), light = new Px(f, f.light);
      if (layer !== "front") {
        scorch(buf, light, gx, gy, t, SCORCH, cool);
        ps.draw(buf, light, "back");
        fx.drawBack(buf, light);
        floorRing(buf, gx, gy, t / 0.5, RING, thick, ringCols, true);
      }
      if (layer !== "back") {
        floorRing(buf, gx, gy, t / 0.5, RING, thick, ringCols, false);
        for (const b of rocks.list) rock(buf, b, ST);
        ps.draw(buf, light, "front");
        fx.drawFront(buf, light);
      }
    },
    done: () => t > 1 && ps.list.length === 0 && !fx.busy && rocks.list.length === 0,
  };
}
const STONE_BODY = hex("#4a3f69");
function stone(c        ) {
  return { light: mix(scale(c, 1.35), WHITE, 0.08), body: c, shade: scale(c, 0.64), dust: mix(scale(c, 1.2), rgb(150, 140, 150), 0.3) };
}
                                      
function scorch(buf    , light    , cx        , cy        , t        , rx0        , cool        ) {
  const rx = rx0 * Math.min(1, t / 0.08), ry = 4;
  for (let y = Math.floor(cy); y <= cy + 2; y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      const k = hash(x * 31 + y);
      const T = Math.pow(clamp(1 - t / cool), 1.4) * (1.25 - d) - k * 0.35;
      if (T > 0.06) {
        const c = HEAT_RAMP[Math.min(HEAT_RAMP.length - 1, Math.floor((1 - Math.min(1, T)) * (HEAT_RAMP.length - 1)))] ;
        buf.set(x, y, c);
        if ((x & 3) === 0) light.glow(x + 0.5, y, 6, c, 0.18 * T);
      } else if (d < 0.95 - k * 0.3 || bayer(x, y) < 1 - d) buf.set(x, y, d < 0.5 ? SOOT : SOOT2);
    }
}
function floorRing(buf    , x        , gy        , k        , rx        , thick        , cols                   , back         ) {
  if (k >= 1 || k < 0) return;
  const r = rx * outCubic(k), col = cols[Math.min(cols.length - 1, Math.floor(k * cols.length))] ;
  ringE(buf, x, gy + 0.5, r, r * 0.16, Math.max(1, thick * (1 - k)), col, 1.15 - k, (a) => (back ? Math.sin(a) < 0 : Math.sin(a) >= 0));
}
function rock(buf    , b     , st       ) {
  const x = b.x / PX, y = b.y / PX, r = 0.6 + b.s * 0.75, fade = Math.min(1, b.life / 0.5);
  const lx = Math.cos(b.a) * r * 0.4, ly = Math.sin(b.a) * r * 0.4;
  for (let py = Math.floor(y - r - 1); py <= Math.ceil(y + r + 1); py++)
    for (let px = Math.floor(x - r - 1); px <= Math.ceil(x + r + 1); px++) {
      const dx = px + 0.5 - x, dy = py + 0.5 - y, d = Math.hypot(dx * 1.15, dy);
      if (d > r + 0.9 || (fade < 1 && fade <= bayer(px, py))) continue;
      const lit = dx * lx + dy * ly;
      buf.set(px, py, d > r ? OUTLINE : lit < -0.4 ? st.light : lit > 0.6 ? st.shade : st.body);
    }
}
const PX = 2;
class Px {
  w        ; h        ; ox        ; oy        ; data             ;
  constructor(f       , data             ) { this.w = f.w; this.h = f.h; this.ox = f.ox; this.oy = f.oy; this.data = data; }
  at(x        , y        ) { x = (x - this.ox) | 0; y = (y - this.oy) | 0; return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x; }
  set(x        , y        , c        ) { const i = this.at(x, y); if (i >= 0) this.data[i] = c; }
  blend(x        , y        , c        , a        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , oa = a + ((d >>> 24) / 255) * (1 - a);
    if (oa <= 0) return;
    const k = a / oa, j = 1 - k, r = (c & 255) * k + (d & 255) * j, g = ((c >>> 8) & 255) * k + ((d >>> 8) & 255) * j, b = ((c >>> 16) & 255) * k + ((d >>> 16) & 255) * j;
    this.data[i] = ((oa * 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  add(x        , y        , c        , k        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , r = Math.min(255, (d & 255) + (c & 255) * k), g = Math.min(255, ((d >>> 8) & 255) + ((c >>> 8) & 255) * k), b = Math.min(255, ((d >>> 16) & 255) + ((c >>> 16) & 255) * k);
    this.data[i] = (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  disc(cx        , cy        , r        , c        ) {
    if (r <= 0.5) return this.set(Math.round(cx), Math.round(cy), c);
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx; if (dx * dx + dy * dy <= r2) this.set(x, y, c); }
    }
  }
  alphaDisc(cx        , cy        , r        , c        , a        ) {
    if (a <= 0.01) return;
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx; if (dx * dx + dy * dy <= r2) this.blend(x, y, c, a); }
    }
  }
  ring(cx        , cy        , r        , thick        , c        , alpha = 1) {
    const ro = r + thick * 0.5, ri = Math.max(0, r - thick * 0.5), ro2 = ro * ro, ri2 = ri * ri;
    for (let y = Math.floor(cy - ro); y <= Math.ceil(cy + ro); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - ro); x <= Math.ceil(cx + ro); x++) {
        const dx = x + 0.5 - cx, d2 = dx * dx + dy * dy;
        if (d2 <= ro2 && d2 >= ri2 && (alpha >= 1 || alpha > bayer(x, y))) this.set(x, y, c);
      }
    }
  }
  line(x0        , y0        , x1        , y1        , c        ) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 4096; n++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) (err += dy), (x0 += sx);
      if (e2 <= dx) (err += dx), (y0 += sy);
    }
  }
  glow(cx        , cy        , r        , c        , k        ) {
    if (r < 1 || k <= 0.01) return;
    const x0 = Math.max(this.ox, Math.floor(cx - r)), x1 = Math.min(this.ox + this.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(this.oy, Math.floor(cy - r)), y1 = Math.min(this.oy + this.h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / r;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / r, d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const f = 1 - Math.sqrt(d);
        this.add(x, y, c, f * f * k);
      }
    }
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayer(x        , y        ) { return (BAYER[((y & 3) << 2) | (x & 3)]  + 0.5) / 16; }
function rgb(r        , g        , b        , a = 255) { return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255); }
function hex(h        ) { const v = parseInt(h.replace("#", ""), 16); return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255); }
function scale(c        , k        ) {
  return rgb(Math.min(255, (c & 255) * k), Math.min(255, ((c >>> 8) & 255) * k), Math.min(255, ((c >>> 16) & 255) * k), c >>> 24);
}
function mix(c1        , c2        , t        ) {
  const u = 1 - t, ch = (c        , s        ) => (c >>> s) & 255;
  return rgb(ch(c1, 0) * u + ch(c2, 0) * t, ch(c1, 8) * u + ch(c2, 8) * t, ch(c1, 16) * u + ch(c2, 16) * t, ch(c1, 24) * u + ch(c2, 24) * t);
}
function ramp(stops                   , t        ) {
  const u = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1), i = Math.floor(u);
  return mix(stops[i] , stops[i + 1] , u - i);
}
const WHITE = hex("#ffffff"), OUTLINE = hex("#1a1422"), SOOT = hex("#0d0a12"), SOOT2 = hex("#17121d"), WARM = rgb(255, 176, 96);
const PAL = { hot: hex("#fff3a6"), yellow: hex("#ffe26b"), gold: hex("#ffc23d"), orange: hex("#ff8a2a"), deepOrange: hex("#f2561d"), red: hex("#c9281f") };
const FIRE_RAMP = [WHITE, PAL.hot, PAL.yellow, PAL.gold, PAL.orange, PAL.deepOrange, PAL.red, hex("#8a1f17"), hex("#4a1712")];
const HEAT_RAMP = [...FIRE_RAMP.slice(0, 8), hex("#4f1a13"), hex("#2a120e")];
const SMOKE_RAMP = [hex("#7b6f72"), hex("#5d5660"), hex("#433d48"), hex("#2b2630"), hex("#1a171e")];
class Rng {
          s        ;
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a        , b        ) { return a + (b - a) * this.next(); }
  int(a        , b        ) { return Math.floor(this.range(a, b + 1)); }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  chance(p        ) { return this.next() < p; }
  pick   (a              )    { return a[Math.floor(this.next() * a.length)] ; }
}
const TAU = Math.PI * 2;
function clamp(v        , a = 0, b = 1) { return v < a ? a : v > b ? b : v; }
function outCubic(t        ) { return 1 - Math.pow(1 - clamp(t), 3); }
function hash(n        , k = 0) { return ((Math.imul(n + 1 + k * 7919, 2654435761) >>> 0) % 100000) / 100000; }
const GRAVITY = 1900;
const PT = { SPARK: 0, EMBER: 1, SMOKE: 2, FIRE: 3, BRAND: 4, DUST: 5, GRIT: 6 }         ;
                                       
const SMOKES = 1, BIG = 2, BACK = 4;
                
        
            
            
             
             
               
              
              
               
               
                
               
 
class Particles {
  list         = [];
  t = 0;
  R     ;
  ground                       ;
  onLand                                 ;
  constructor(R     , ground                       ) { this.R = R; this.ground = ground; }
  spawn(k    , x        , y        , vx        , vy        , life        , col = 0, size = 1, delay = 0, flag = 0) {
    this.list.push({ k, x, y, vx, vy, life, max: life, col, size, seed: this.R.next() * 100, delay, flag });
  }
  impulse(x        , y        , r        , force        ) {
    for (const p of this.list) {
      if (p.k === PT.FIRE) continue;
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
      if (d > r) continue;
      const f = force * (1 - d / r) * (p.k === PT.SMOKE || p.k === PT.DUST ? 0.35 : 1);
      p.vx += (dx / d) * f;
      p.vy += (dy / d) * f - f * 0.3;
    }
  }
  update(dt        ) {
    this.t += dt;
    const t = this.t, R = this.R, L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i] ;
      if (p.delay > 0) { p.delay -= dt; continue; }
      if ((p.life -= dt) <= 0) {
        if (p.k === PT.FIRE && p.flag & SMOKES) {
          const big = p.flag & BIG;
          this.spawn(PT.SMOKE, p.x, p.y, p.vx * 0.6, p.vy * 0.6 - 12, big ? R.range(1.3, 2.3) : R.range(0.8, 1.4), 0, p.size * (big ? 0.85 : 0.7), 0, big ? BIG : 0);
        }
        L.splice(i, 1);
        continue;
      }
      const g = this.ground(p.x);
      switch (p.k) {
        case PT.SPARK: {
          p.vy += GRAVITY * 0.45 * dt;
          p.vx -= p.vx * 2.2 * dt;
          p.vy -= p.vy * 2.2 * dt;
          const ny = p.y + p.vy * dt;
          p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= g && ny >= g) { p.vy = -p.vy * 0.45; p.vx *= 0.7; p.y = g - 0.5; } else p.y = ny;
          break;
        }
        case PT.EMBER:
          p.vy += (-60 + Math.sin(t * 3 + p.seed) * 40) * dt;
          p.vx += Math.cos(t * 2.3 + p.seed) * 90 * dt;
          p.vx -= p.vx * 1.6 * dt;
          p.vy -= p.vy * 1.6 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case PT.SMOKE: {
          const big = p.flag & BIG;
          p.vy -= (big ? 46 : 32) * dt;
          p.vx += Math.sin(t * 1.3 + p.seed) * 16 * dt;
          p.vx -= p.vx * 1.6 * dt;
          p.vy -= p.vy * 1.2 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        }
        case PT.FIRE:
          p.vy -= 190 * dt;
          p.vx += Math.sin(t * 17 + p.seed) * 60 * dt;
          p.vx -= p.vx * 5 * dt;
          p.vy -= p.vy * 3.2 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case PT.DUST:
          p.vx -= p.vx * 4 * dt;
          p.vy -= p.vy * 4 * dt + 10 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case PT.GRIT: {
          p.vy += GRAVITY * dt;
          p.vx -= p.vx * 0.8 * dt;
          const ny = p.y + p.vy * dt;
          p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= g && ny >= g) {
            p.y = g - 0.5;
            if (p.vy > 260 && R.chance(0.4)) (p.vy = -p.vy * 0.25), (p.vx = p.vx * 0.5 + R.range(-20, 20));
            else (p.vx = p.vy = 0), (p.life = Math.min(p.life, 0.5));
          } else p.y = ny;
          break;
        }
        case PT.BRAND: {
          p.vy += GRAVITY * 0.8 * dt;
          p.vx -= p.vx * 0.9 * dt;
          if (R.chance(0.9)) this.spawn(PT.FIRE, p.x, p.y, p.vx * 0.1 + R.range(-15, 15), p.vy * 0.1 - 20, R.range(0.16, 0.32), 0, R.range(0.9, 1.7) * (0.5 + (p.life / p.max) * 0.6), 0, R.chance(0.4) ? SMOKES : 0);
          const ny = p.y + p.vy * dt;
          p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= g && ny >= g) { this.onLand?.(p.x, g); L.splice(i, 1); } else p.y = ny;
          break;
        }
      }
    }
  }
  draw(buf    , light    , layer       ) {
    const back = layer === "back";
    if (back) for (const p of this.list) if (p.delay <= 0 && (p.k === PT.SMOKE || p.k === PT.DUST)) this.drawOne(p, buf, light);
    for (const p of this.list) if (p.delay <= 0 && p.k !== PT.SMOKE && p.k !== PT.DUST && !(p.flag & BACK) !== back) this.drawOne(p, buf, light);
  }
          drawOne(p      , buf    , light    ) {
    const k = p.life / p.max, ax = p.x / PX, ay = p.y / PX, px = Math.floor(ax), py = Math.floor(ay);
    switch (p.k) {
      case PT.SMOKE: {
        const age = 1 - k, big = p.flag & BIG;
        const r = p.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * (big ? 0.5 : 0.4));
        const a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * (big ? 0.7 : 0.58);
        const c = p.col ? mix(p.col, ramp(SMOKE_RAMP, age), age) : ramp(SMOKE_RAMP, age * 1.05);
        buf.alphaDisc(ax, ay, r, c, a * 0.45);
        buf.alphaDisc(ax + r * 0.05, ay + r * 0.06, r * 0.74, c, a * 0.62);
        if (age < 0.5) buf.alphaDisc(ax - r * 0.22, ay - r * 0.3, r * 0.5, mix(c, WHITE, 0.12), a * 0.4 * (1 - age * 2));
        break;
      }
      case PT.DUST:
        buf.alphaDisc(ax, ay, p.size * (0.6 + (1 - k) * 0.9), p.col, Math.pow(k, 1.3) * 0.7);
        break;
      case PT.GRIT:
        if (k > 0.25 || bayer(px, py) < k * 4) {
          buf.set(px, py, p.col);
          if (p.size >= 2) { buf.set(px + 1, py, p.col); buf.set(px, py + 1, scale(p.col, 0.8)); buf.set(px + 1, py + 1, scale(p.col, 0.7)); }
        }
        break;
      case PT.FIRE: {
        const age = 1 - k, heat = Math.min(0.999, Math.pow(age, 0.62) + (p.seed % 1) * 0.1);
        const idx = Math.min(FIRE_RAMP.length - 2, Math.floor(heat * (FIRE_RAMP.length - 1)));
        const r = p.size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = FIRE_RAMP[idx] ;
        if (idx >= FIRE_RAMP.length - 2) buf.alphaDisc(ax, ay, r, c, Math.min(1, k * 3) * 0.85);
        else {
          buf.disc(ax, ay, r, FIRE_RAMP[Math.min(FIRE_RAMP.length - 1, idx + 2)] );
          buf.disc(ax - r * 0.16, ay - r * 0.22, r * 0.78, c);
          if (r > 1.6) buf.disc(ax, ay - r * 0.9, r * 0.42, c);
          if (idx <= 3 && r > 1.8) buf.disc(ax - r * 0.28, ay - r * 0.34, r * 0.36, FIRE_RAMP[Math.max(0, idx - 1)] );
          if (idx < 6) light.glow(ax, ay, r * 2.4 + 2, c, 0.18 * k);
        }
        break;
      }
      case PT.BRAND:
        buf.disc(ax, ay, 1.6, PAL.deepOrange);
        buf.set(px, py, Math.sin(this.t * 40 + p.seed) > 0 ? PAL.hot : PAL.yellow);
        buf.set(px + 1, py, PAL.yellow);
        light.glow(ax, ay, 7, PAL.orange, 0.45);
        break;
      case PT.SPARK: {
        const hot = k > 0.6 ? PAL.hot : k > 0.3 ? PAL.yellow : PAL.orange;
        const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, len = Math.min(9, 1 + sp * 0.011);
        buf.line(ax - ux * len, ay - uy * len, ax - ux * len * 0.4, ay - uy * len * 0.4, k > 0.5 ? hot : PAL.deepOrange);
        buf.line(ax - ux * len * 0.45, ay - uy * len * 0.45, ax, ay, hot);
        light.glow(ax, ay, 3, hot, 0.45 * k);
        break;
      }
      case PT.EMBER: {
        const c = k > 0.5 ? (Math.sin(this.t * 22 + p.seed * 3) > -0.2 ? PAL.yellow : PAL.orange) : k > 0.2 ? PAL.orange : PAL.red;
        buf.set(px, py, c);
        light.glow(ax, ay, 3, c, 0.3 * k);
        break;
      }
    }
  }
}
                                                                   
class Fx {
  flashes                            = [];
  rings                                                                       = [];
  lights                                                      = [];
  blazes                                             = [];
  ps           ;
  constructor(ps           ) { this.ps = ps; ps.onLand = (x, y) => this.blaze(x, y - 0.5, ps.R.range(2.2, 4.5), ps.R.range(0.55, 0.85)); }
  get busy() { return this.flashes.length + this.rings.length + this.lights.length + this.blazes.length > 0; }
  light(x        , y        , r        , color        , k        , life        ) { this.lights.push({ x, y, r, color, k, life, max: life }); }
  ring(x        , y        , r0        , r1        , life        , thick        , color        ) {
    this.rings.push({ x, y, r0, r1, life, max: life, thick, color });
  }
  blaze(x        , y        , life        , power        ) { this.blazes.push({ x, y, life, max: life, acc: this.ps.R.next(), power }); }
  update(dt        ) {
    for (const a of [this.flashes, this.rings, this.lights]             ) for (let i = a.length - 1; i >= 0; i--) if ((a[i] .life -= dt) <= 0) a.splice(i, 1);
    const ps = this.ps, R = ps.R;
    for (let i = this.blazes.length - 1; i >= 0; i--) {
      const b = this.blazes[i] ;
      if ((b.life -= dt) <= 0) { this.blazes.splice(i, 1); continue; }
      const k = b.life / b.max, intensity = b.power * (k > 0.7 ? 1 : 0.35 + (k / 0.7) * 0.65);
      for (b.acc += dt * (6 + 16 * intensity); b.acc > 1; b.acc--) {
        const s = R.range(1.2, 2.8) * intensity;
        ps.spawn(PT.FIRE, b.x + R.range(-3, 3), b.y - s * 0.6, R.range(-12, 12), R.range(-60, -25), R.range(0.28, 0.6), 0, s, 0, BACK | (R.chance(0.3) ? SMOKES : 0));
        if (R.chance(0.06)) ps.spawn(PT.EMBER, b.x, b.y - 3, R.range(-30, 30), R.range(-90, -30), R.range(0.6, 1.4), PAL.orange, 1, 0, BACK);
      }
    }
  }
  drawBack(buf    , light    ) {
    for (const b of this.blazes) {
      const k = b.life / b.max, ax = b.x / PX, ay = b.y / PX;
      buf.set(Math.floor(ax), Math.floor(ay), k > 0.4 ? (Math.sin(b.life * 31 + b.x) > 0 ? PAL.yellow : PAL.orange) : PAL.red);
      light.glow(ax, ay, 6 + 5 * k * b.power, PAL.orange, 0.3 * k * b.power);
    }
  }
  drawFront(buf    , light    ) {
    for (const f of this.flashes) {
      const k = f.life / f.max, ax = f.x / PX, ay = f.y / PX, r = f.r * (0.8 + 0.2 * k);
      buf.disc(ax, ay, r + 1.2, PAL.deepOrange);
      buf.disc(ax, ay, r, k > 0.45 ? PAL.hot : PAL.yellow);
      buf.disc(ax, ay, r * 0.6, k > 0.45 ? WHITE : PAL.hot);
    }
    for (const r of this.rings) {
      const k = r.life / r.max, e = 1 - Math.pow(k, 3);
      buf.ring(r.x / PX, r.y / PX, (r.r0 + (r.r1 - r.r0) * e) / PX, Math.max(1, r.thick * k + 0.4), r.color, Math.min(1, k * 1.6));
    }
    for (const l of this.lights) { const k = l.life / l.max; light.glow(l.x / PX, l.y / PX, (l.r / PX) * (0.55 + 0.45 * k), l.color, l.k * k * k); }
  }
  explosion(x        , y        , rad        , power = 1, fire = 1) {
    const ps = this.ps, R = ps.R, ar = rad / PX;
    this.flashes.push({ x, y, r: ar * 1.05, life: 0.06, max: 0.06 });
    this.ring(x, y, rad * 0.45, rad * 2.7, 0.34, 3, PAL.yellow);
    this.ring(x, y, rad * 0.3, rad * 1.6, 0.22, 1.8, PAL.orange);
    this.light(x, y, rad * 3.4, WARM, 0.6 * power, 0.7);
    this.light(x, y, rad * 1.6, WHITE, 0.6, 0.08);
    for (let i = 0; i < 5; i++) ps.spawn(PT.FIRE, x + R.range(-5, 5), y + R.range(-5, 5), R.range(-40, 40), R.range(-80, -20), R.range(0.18, 0.3), 0, R.range(ar * 0.4, ar * 0.55));
    for (let i = 0; i < Math.round(28 * power * fire); i++) {
      const a = R.range(0, TAU), d = R.range(0, rad * 0.55), sp = R.range(80, 420) * power;
      ps.spawn(PT.FIRE, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 80, R.range(0.55, 1.15), 0, R.range(ar * 0.22, ar * 0.46), 0, R.chance(0.45) ? SMOKES | BIG : 0);
    }
    for (let i = 0; i < 5; i++) {
      const a = R.range(0, TAU), d = R.range(rad * 0.1, rad * 0.5);
      ps.spawn(PT.SMOKE, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * 60, Math.sin(a) * 40 - 60, R.range(0.9, 1.5), rgb(34, 29, 38), R.range(ar * 0.15, ar * 0.26), R.range(0.06, 0.2), BIG);
    }
    for (let i = 0; i < Math.round(5 * fire); i++) ps.spawn(PT.FIRE, x + R.range(-rad * 0.25, rad * 0.25), y, R.range(-25, 25), R.range(-360, -200), R.range(0.8, 1.3), 0, R.range(ar * 0.24, ar * 0.36), R.range(0, 0.1), R.chance(0.6) ? SMOKES | BIG : 0);
    for (let i = 0; i < Math.round(10 * power); i++) {
      const a = R.range(0, TAU), d = R.range(0, rad * 0.7), sp = R.range(30, 200);
      ps.spawn(PT.SMOKE, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 70, R.range(1.8, 3), 0, R.range(ar * 0.26, ar * 0.44), R.range(0.12, 0.45), BIG);
    }
    for (let i = 0; i < Math.round(80 * power); i++) {
      const a = R.range(0, TAU), sp = R.range(320, 1200) * power;
      ps.spawn(PT.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 140, R.range(0.18, 0.7));
    }
    for (let i = 0; i < Math.round(40 * power * fire); i++) {
      const a = R.range(0, TAU), sp = R.range(60, 360);
      ps.spawn(PT.EMBER, x + Math.cos(a) * rad * 0.4, y + Math.sin(a) * rad * 0.4, Math.cos(a) * sp, Math.sin(a) * sp - 150, R.range(1.2, 3.2), PAL.orange);
    }
    for (let i = 0; i < Math.round(R.range(9, 14) * Math.max(0, power - 0.55) * fire); i++) {
      const a = -Math.PI / 2 + R.range(-1.35, 1.35), sp = R.range(380, 820);
      ps.spawn(PT.BRAND, x, y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.7, 1.5));
    }
    ps.impulse(x, y, rad * 2.6, 720 * power);
  }
  dust(x        , y        , n        , spread        , color        ) {
    const R = this.ps.R, dc = mix(color, rgb(150, 140, 150), 0.35);
    for (let i = 0; i < n; i++) this.ps.spawn(PT.DUST, x + R.range(-3, 3), y - 1, R.sign() * R.range(20, 110) * spread, -R.range(5, 45), R.range(0.3, 0.65), dc, R.range(1.3, 2.8));
  }
}
                                                                                                                             
class Bits {
  list        = [];
  ground                       ;
  constructor(ground                       ) { this.ground = ground; }
  add(x        , y        , vx        , vy        , life        , a        , va        , s        ) {
    this.list.push({ x, y, vx, vy, life, a, va, s, rest: false });
  }
  step(dt        , onLand                                 ) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i] ;
      if ((b.life -= dt) <= 0) { this.list.splice(i, 1); continue; }
      if (b.rest) continue;
      b.vy += GRAVITY * dt;
      b.vx -= b.vx * 0.25 * dt;
      b.vy -= b.vy * 0.25 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
      const floor = this.ground(b.x);
      if (b.y >= floor && b.vy > 0) {
        const sp = b.vy;
        b.y = floor - 0.01;
        onLand(b, sp);
        if (sp > 140) { b.vy = -sp * 0.32; b.vx *= 0.7; b.va *= 0.6; } else { b.rest = true; b.vx = b.vy = 0; }
      }
    }
  }
}
function dot(buf    , x        , y        , c        , a = 1) {
  const px = Math.floor(x), py = Math.floor(y);
  if (a >= 1 || a > bayer(px, py)) buf.set(px, py, c);
}
function ringE(buf    , cx        , cy        , rx        , ry        , thick        , c        , a        , keep                          ) {
  const n = Math.ceil(Math.max(rx, ry) * TAU * 1.3);
  for (let j = 0; j < n; j++) {
    const ang = (j / n) * TAU;
    if (!keep(ang)) continue;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let off = -thick / 2; off <= thick / 2; off += 0.5) dot(buf, cx + ca * (rx + off), cy + sa * (ry + off * (ry / Math.max(1, rx))), c, a);
  }
}

window.SF_VFX.explosion = explosion;
})();
(() => {
// Made by Sprite Fusion, to have full context over VFX, connect to the MCP: https://www.spritefusion.com/mcp
// MIT License
// Copyright (c) 2026 Hugo Duprez
                                                                                                               
                                     
                                                   
                          
             
             
                 
                  
                
                           
                     
                                            
                
                
                               
                                                          
 
function blood(o          = {}) {
  const R = new Rng(o.seed ?? 1), C = o.ramp ?? BLOOD, A = o.angle ?? 3.45, N = o.amount ?? 1, S = o.size ?? 1, LIFE = o.stainLife ?? 6;
  const groundAt = (x        ) => (o.ground === undefined ? Infinity : typeof o.ground === "number" ? o.ground : o.ground(x));
  const feet0 = o.actor?.feet() ?? [o.x ?? 640, (o.y ?? 556) + 44];
  const X = o.x ?? feet0[0], Y = o.y ?? feet0[1] - 44, ux = Math.cos(A), uy = Math.sin(A);
  const wound = ()                   => { if (!o.actor) return [X, Y]; const [fx, fy] = o.actor.feet(); return [fx + X - feet0[0], fy + Y - feet0[1]]; };
  const drops         = [], stains          = [], mist         = [];
  const strands = Array.from({ length: 7 }, (_, i) => {
    const u = (i - 3) / 3;
    return { a: A + u * 0.62 + R.range(-0.08, 0.08), l: (11 + 7 * (1 - Math.abs(u)) + R.range(-2, 3)) * S, w: (1.3 + 0.6 * (1 - Math.abs(u))) * S };
  });
  const drips = [R.range(0.22, 0.32), R.range(0.6, 0.8), R.range(1.1, 1.4)].slice(0, N >= 1 ? 3 : 2).map((t0) => ({ t0, fell: false }));
  let t = 0;
  o.cue?.("hurt", { t: 0.12 });
  o.cue?.("knock", { vx: ux * 520 * Math.min(1.4, Math.sqrt(N)), vy: -60 });
  o.shake?.(0.25 * Math.min(1.5, N));
  const n = Math.round(46 * N);
  for (let i = 0; i < n; i++) {
    const s = R.chance(0.12) ? 3 : R.chance(0.35) ? 2 : 1, spread = R.range(-1, 1) * R.range(0.1, 0.65) * (s === 1 ? 1.2 : 0.8);
    const delay = R.range(0, 0.07), sp = (s === 1 ? R.range(260, 950) : s === 2 ? R.range(200, 650) : R.range(150, 460)) * (1 - delay * 4) * Math.sqrt(S), a = A + spread;
    drops.push({ x: X + ux * R.range(0, 8), y: Y + uy * R.range(0, 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - R.range(0, 150), s, delay, life: 3, crown: false, seed: R.next() });
  }
  for (let i = 0; i < Math.round(14 * N); i++) {
    const a = A + R.range(-0.12, 0.12), sp = R.range(620, 1050) * Math.sqrt(S);
    drops.push({ x: X, y: Y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - R.range(0, 60), s: R.chance(0.25) ? 2 : 1, delay: (i / 14) * 0.05, life: 3, crown: false, seed: R.next() });
  }
  for (let i = 0; i < Math.round(6 * Math.sqrt(N)); i++) {
    const a = A + R.range(-0.5, 0.5), sp = R.range(30, 110);
    mist.push({ x: X + ux * R.range(2, 14), y: Y + uy * R.range(2, 14), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 12, r: R.range(2.5, 5) * S, life: R.range(0.35, 0.6), max: 0, t0: R.range(0, 0.05) });
  }
  for (const m of mist) m.max = m.life;
  function splat(d      , g        ) {
    const sp = Math.hypot(d.vx, d.vy), dir = Math.sign(d.vx) || 1;
    const w = (d.s === 1 ? 0.5 + Math.min(0.6, sp / 1200) : d.s * 0.6 + Math.min(0.9, sp / 800)) * (d.crown ? 0.5 : 1);
    const sats                     = [];
    for (let k = 0; k < (d.s >= 2 && sp > 350 ? 2 : sp > 450 ? 1 : 0); k++) sats.push([R.range(1, 3) + k * R.range(1.5, 3), R.chance(0.2) ? 2 : 1]);
    stains.push({ x: d.x / PX, y: Math.round(g / PX), w, lean: Math.min(1, Math.abs(d.vx) / 400), dir, t0: t, sats, tone: R.chance(0.3) ? 1 : 0 });
    if (!d.crown && d.s >= 2 && sp > 260) for (let k = 0; k < R.int(1, 3); k++) drops.push({ x: d.x, y: g - 1, vx: dir * R.range(10, 130) + R.range(-70, 70), vy: -R.range(80, 170), s: 1, delay: 0, life: 0.8, crown: true, seed: R.next() });
  }
  return {
    update(dt        ) {
      t += dt;
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i] ;
        if (d.delay > 0) { d.delay -= dt; continue; }
        if ((d.life -= dt) <= 0) { drops.splice(i, 1); continue; }
        const drag = 0.7 / d.s;
        d.vy += GRAVITY * dt;
        d.vx -= d.vx * drag * dt;
        d.vy -= d.vy * drag * 0.5 * dt;
        const py = d.y;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        const g = groundAt(d.x);
        if (d.vy > 0 && py <= g && d.y >= g) { splat(d, g); drops.splice(i, 1); }
      }
      const [wx, wy] = wound();
      for (const d of drips)
        if (!d.fell && t >= d.t0 + 0.2) {
          d.fell = true;
          drops.push({ x: wx + R.range(-1, 1), y: wy + 6, vx: R.range(-10, 10), vy: 30, s: R.chance(0.5) ? 2 : 1, delay: 0, life: 3, crown: false, seed: R.next() });
        }
      for (let i = mist.length - 1; i >= 0; i--) {
        const m = mist[i] ;
        if (m.t0 > 0) { m.t0 -= dt; continue; }
        if ((m.life -= dt) <= 0) { mist.splice(i, 1); continue; }
        m.vx -= m.vx * 3 * dt;
        m.vy -= m.vy * 3 * dt + 6 * dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
      }
    },
    draw(f       , layer        ) {
      const buf = new Px(f, f.color), light = new Px(f, f.light);
      if (layer !== "front")
        for (const s of stains) {
          const age = t - s.t0, fade = 1 - clamp((age - LIFE) / 1.2);
          if (fade <= 0) continue;
          const spread = smooth(0, 0.12, age), hw = s.w * (0.55 + 0.45 * spread);
          const dry = Math.min(4, (age < 0.35 ? 1 : age < 1.4 ? 2 : age < 3.2 ? 3 : 4) + s.tone), body = C[dry] , under = C[Math.min(5, dry + 1)] ;
          const x0 = s.x - hw * (1 - 0.3 * s.lean), x1 = s.x + hw * (1 + 0.8 * s.lean), lo = s.dir > 0 ? x0 : 2 * s.x - x1, hi = s.dir > 0 ? x1 : 2 * s.x - x0;
          for (let x = Math.floor(lo); x <= Math.ceil(hi); x++) {
            const q = Math.abs(x + 0.5 - s.x) / Math.max(0.5, (hi - lo) / 2);
            if (fade < 1 && fade <= bayer(x, s.y)) continue;
            dot(buf, x, s.y, q > 0.85 && s.w > 1 ? under : body);
            if (s.w > 1.6 && q < 0.6) dot(buf, x, s.y + 1, under);
            if (s.w > 2.2 && q < 0.45) dot(buf, x, s.y - 1, q < 0.2 && age < 1 ? C[1]  : body);
          }
          if (age < 0.4 && s.w > 1) dot(buf, s.x - s.dir * hw * 0.3, s.y, C[0] );
          for (const [d, sz] of s.sats) {
            const sx = s.x + s.dir * (hw * (1 + 0.6 * s.lean) + d * spread);
            if (fade < 1 && fade <= bayer(Math.floor(sx), s.y)) continue;
            dot(buf, sx, s.y, body);
            if (sz > 1) dot(buf, sx + s.dir, s.y, under);
          }
        }
      if (layer === "back") return;
      for (const m of mist) {
        if (m.t0 > 0) continue;
        const k = m.life / m.max;
        buf.alphaDisc(m.x / PX, m.y / PX, m.r * (1.6 - 0.6 * k), C[3] , 0.4 * k * Math.min(1, (1 - k) * 8));
      }
      if (t < 0.09) {
        const grow = outCubic(t / 0.045), brk = clamp((t - 0.04) / 0.05), [wx, wy] = [X / PX, Y / PX];
        for (const s of strands) {
          const L = s.l * grow, d0 = L * brk, ca = Math.cos(s.a), sa = Math.sin(s.a);
          for (let pass = 0; pass < 3; pass++)
            for (let d = d0; d <= L; d += 0.5) {
              const u = d / Math.max(1, L), r = s.w * Math.pow(1 - u, 0.6) * (1 - brk * 0.5) + (u > 0.85 ? 0.5 : 0);
              if (r < 0.35) continue;
              const x = wx + ca * d, y = wy + sa * d;
              if (pass === 0) buf.disc(x, y, r + 0.7, C[4] );
              else if (pass === 1) buf.disc(x, y, r, d < L * 0.35 ? C[1]  : C[2] );
              else if (d < L * 0.5 && r > 0.9) buf.set(Math.round(x - sa * r * 0.4), Math.round(y + ca * r * 0.4 - 0.4), C[0] );
            }
        }
        if (t < 0.035) { buf.disc(wx, wy, 2.6 * S, C[1] ); buf.disc(wx, wy, 1.5 * S, C[0] ); }
        light.glow(wx, wy, 16 * S, C[1] , 0.25 * (1 - t / 0.09));
      }
      const [wx, wy] = wound();
      for (const d of drips) {
        const u = t - d.t0;
        if (u < 0 || u > 1.6) continue;
        const run = Math.min(3, 3 * smooth(0, 0.18, u)), fade = 1 - clamp((u - 1) / 0.6);
        for (let k = 0; k <= run; k++) dot(buf, wx / PX, wy / PX + k, C[3] , fade);
        if (!d.fell) {
          const bead = smooth(0, 0.2, u);
          dot(buf, wx / PX, wy / PX + run + 1, C[2] );
          if (bead > 0.6) {
            dot(buf, wx / PX + 1, wy / PX + run + 1, C[3] );
            dot(buf, wx / PX, wy / PX + run + 2, C[2] );
            dot(buf, wx / PX, wy / PX + run + 1, C[0] );
          }
        }
      }
      for (const d of drops) if (d.delay <= 0) drop(buf, d, C);
    },
    done: () => t > 1 && drops.length === 0 && stains.every((s) => t - s.t0 > LIFE + 1.2),
  };
}
                                                                                                                                     
                                                                                                                                  
                                                                                                                 
function drop(buf    , d      , C                   ) {
  const x = d.x / PX, y = d.y / PX, sp = Math.hypot(d.vx, d.vy) || 1, ux = d.vx / sp, uy = d.vy / sp, tail = Math.min(6, sp * 0.008);
  if (tail >= 1) buf.line(x - ux * tail, y - uy * tail, x - ux, y - uy, d.s >= 2 ? C[2]  : C[3] );
  if (d.s === 3) { buf.disc(x, y, 1.7, C[4] ); buf.disc(x, y, 1.15, C[1] ); buf.set(Math.round(x - 0.7), Math.round(y - 0.7), C[0] ); } else if (d.s === 2) {
    const px = Math.floor(x), py = Math.floor(y);
    buf.set(px, py, C[0] );
    buf.set(px + 1, py, C[1] );
    buf.set(px, py + 1, C[2] );
    buf.set(px + 1, py + 1, C[3] );
  } else buf.set(Math.floor(x), Math.floor(y), d.seed < 0.5 ? C[1]  : C[2] );
}
const PX = 2;
class Px {
  w        ; h        ; ox        ; oy        ; data             ;
  constructor(f       , data             ) { this.w = f.w; this.h = f.h; this.ox = f.ox; this.oy = f.oy; this.data = data; }
  at(x        , y        ) { x = (x - this.ox) | 0; y = (y - this.oy) | 0; return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x; }
  set(x        , y        , c        ) { const i = this.at(x, y); if (i >= 0) this.data[i] = c; }
  blend(x        , y        , c        , a        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , oa = a + ((d >>> 24) / 255) * (1 - a);
    if (oa <= 0) return;
    const k = a / oa, j = 1 - k, r = (c & 255) * k + (d & 255) * j, g = ((c >>> 8) & 255) * k + ((d >>> 8) & 255) * j, b = ((c >>> 16) & 255) * k + ((d >>> 16) & 255) * j;
    this.data[i] = ((oa * 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  add(x        , y        , c        , k        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , r = Math.min(255, (d & 255) + (c & 255) * k), g = Math.min(255, ((d >>> 8) & 255) + ((c >>> 8) & 255) * k), b = Math.min(255, ((d >>> 16) & 255) + ((c >>> 16) & 255) * k);
    this.data[i] = (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  disc(cx        , cy        , r        , c        ) {
    if (r <= 0.5) return this.set(Math.round(cx), Math.round(cy), c);
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx; if (dx * dx + dy * dy <= r2) this.set(x, y, c); }
    }
  }
  alphaDisc(cx        , cy        , r        , c        , a        ) {
    if (a <= 0.01) return;
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx; if (dx * dx + dy * dy <= r2) this.blend(x, y, c, a); }
    }
  }
  line(x0        , y0        , x1        , y1        , c        ) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 4096; n++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) (err += dy), (x0 += sx);
      if (e2 <= dx) (err += dx), (y0 += sy);
    }
  }
  glow(cx        , cy        , r        , c        , k        ) {
    if (r < 1 || k <= 0.01) return;
    const x0 = Math.max(this.ox, Math.floor(cx - r)), x1 = Math.min(this.ox + this.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(this.oy, Math.floor(cy - r)), y1 = Math.min(this.oy + this.h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / r;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / r, d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const f = 1 - Math.sqrt(d);
        this.add(x, y, c, f * f * k);
      }
    }
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayer(x        , y        ) { return (BAYER[((y & 3) << 2) | (x & 3)]  + 0.5) / 16; }
function dot(buf    , x        , y        , c        , a = 1) {
  const px = Math.floor(x), py = Math.floor(y);
  if (a >= 1 || a > bayer(px, py)) buf.set(px, py, c);
}
function rgb(r        , g        , b        ) { return (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255); }
function hex(h        ) { const v = parseInt(h.replace("#", ""), 16); return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255); }
const BLOOD = ["#ff8a7a", "#f2384a", "#c71e33", "#931327", "#5e0c1b", "#350711"].map(hex);
const GRAVITY = 1900;
class Rng {
          s        ;
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a        , b        ) { return a + (b - a) * this.next(); }
  int(a        , b        ) { return Math.floor(this.range(a, b + 1)); }
  chance(p        ) { return this.next() < p; }
}
function clamp(v        , a = 0, b = 1) { return v < a ? a : v > b ? b : v; }
function smooth(a        , b        , x        ) { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }
function outCubic(t        ) { return 1 - Math.pow(1 - clamp(t), 3); }

window.SF_VFX.blood = blood;
})();
(() => {
// Made by Sprite Fusion, to have full context over VFX, connect to the MCP: https://www.spritefusion.com/mcp
// MIT License
// Copyright (c) 2026 Hugo Duprez
                                                                                                               
                                     
                          
                            
             
             
                 
                  
                
                           
                   
                                            
                
                               
 
function impact(o          = {}) {
  const kind = o.kind ?? "hit", glance = kind === "ricochet";
  const X = o.x ?? 760, Y = o.y ?? 600, A = o.angle ?? 0.2, S = o.size ?? (glance ? 0.9 : 1), C = o.ramp ?? WARM_RAMP;
  const R = new Rng(o.seed ?? 1);
  const groundAt = (x        ) => (o.ground === undefined ? Infinity : typeof o.ground === "number" ? o.ground : o.ground(x));
  const ps = new Particles(R, groundAt, C);
  const ax = X / PX, ay = Y / PX, dx = Math.cos(A), dy = Math.sin(A);
  const onSurface = o.surface !== undefined, N = o.normal ?? -Math.PI / 2;
  const nx = Math.cos(N), ny = Math.sin(N), dn = dx * nx + dy * ny;
  const B = onSurface ? Math.atan2(dy - 2 * dn * ny, dx - 2 * dn * nx) : A;
  const spikes = Array.from({ length: 8 }, (_, i) => {
    const a = B + (i / 8) * TAU + R.range(-0.18, 0.18), cb = Math.cos(a - B);
    const into = onSurface ? Math.cos(a - N) < -0.2 : false;
    const len = (7 + R.range(0, 3)) * S * (1 + (glance ? 2.6 : 1.8) * Math.pow(Math.max(0, cb), 3) + 0.6 * Math.pow(Math.max(0, -cb), 3)) * (into ? 0.3 : 1) * (glance && Math.abs(Math.sin(a - B)) > 0.6 ? 0.6 : 1);
    return { a, len, w: (1.5 + R.range(0, 0.6)) * S };
  });
  const open = (a        ) => !onSurface || Math.cos(a - N) > -0.25;
  const shards = [...spikes].filter((p) => open(p.a)).sort((p, q) => q.len - p.len).slice(0, 4).map((s) => ({ a: s.a + R.range(-0.15, 0.15), r: s.len * 0.8, v: s.len * R.range(5, 8), arc: R.range(0.35, 0.6) }));
  let t = 0;
  const n = Math.round((glance ? 10 : 6) + 12 * S);
  for (let i = 0; i < n; i++) {
    const back = !onSurface && R.chance(0.2);
    const a = (back ? A + Math.PI : B) + R.range(-1, 1) * (glance ? 0.3 : onSurface ? 0.85 : 0.6), sp = R.range(260, 900) * (0.6 + 0.4 * S) * (glance ? 1.2 : 1);
    ps.spawn(PT.SPARK, X, Y, Math.cos(a) * sp, Math.sin(a) * sp - (glance ? 20 : 60), R.range(0.1, 0.3) * (glance ? 1.3 : 1));
  }
  if (onSurface) {
    const sc = o.surface , dc = mix(sc, rgb(150, 140, 150), 0.35);
    for (let i = 0; i < Math.round((glance ? 2 : 3) + 5 * S); i++) {
      const a = (glance ? B : N) + R.range(-0.8, 0.8) * (glance ? 0.6 : 1), sp = R.range(150, 420) * S;
      ps.spawn(PT.CHIP, X, Y + ny * 2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.8, 1.4), R.chance(0.5) ? scale(sc, 1.25) : R.chance(0.5) ? sc : scale(sc, 0.7), R.chance(0.3) ? 2 : 1);
    }
    for (let i = 0; i < Math.round(3 + 4 * S); i++) {
      const a = N + R.range(-1, 1), sp = R.range(20, 90) * S;
      ps.spawn(PT.DUST, X + nx * 3, Y + ny * 3, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.35, 0.7), dc, R.range(1.4, 2.8) * Math.sqrt(S));
    }
    ps.spawn(PT.SMOKE, X + nx * 4, Y + ny * 4, R.range(-8, 8), R.range(-30, -14), R.range(0.8, 1.3), SMOKE, R.range(1.6, 2.4) * Math.sqrt(S), 0.05);
  }
  o.shake?.(0.03 * S);
  const tx = Math.cos(B), ty = Math.sin(B), STREAK = 0.16, SPEED = 1500;
  const sx = Math.cos(N + Math.PI / 2) * Math.sign(Math.cos(A - (N + Math.PI / 2)) || 1), sy = Math.sin(N + Math.PI / 2) * Math.sign(Math.cos(A - (N + Math.PI / 2)) || 1);
  return {
    update(dt        ) { t += dt; ps.update(dt); },
    draw(fr       , layer        ) {
      const buf = new Px(fr, fr.color), light = new Px(fr, fr.light);
      if (layer !== "front") {
        if (glance && onSurface && t < 1.1) {
          const T = clamp(1 - t / 0.9), L = 9 * S;
          for (let d = 0; d <= L; d += 0.5) {
            const k = d / L, px = ax - sx * d, py = ay - sy * d;
            const c = T * (1 - k) > 0.5 ? C[1]  : T * (1 - k) > 0.25 ? C[3]  : T > 0 ? C[5]  : SOOT;
            dot(buf, px, py, c, 1 - k * 0.6);
            if (T > 0.2 && (d | 0) % 3 === 0) light.glow(px, py, 4, C[3] , 0.3 * T * (1 - k));
          }
        }
        ps.draw(buf, light, "back");
      }
      if (layer === "back") return;
      const f = Math.max(1, Math.ceil(t * 60 - 1e-6));
      if (f === 1) star(buf, ax, ay, spikes, S, 1, 1, C[0] , C[1] , C[2] , C[4] );
      else if (f === 2) star(buf, ax, ay, spikes, S, 1.25, 0.55, C[1] , C[2] , C[3] , C[4] );
      if (f >= 3 && t < 0.13) {
        const k = (t - 2 / 60) / (0.13 - 2 / 60);
        for (const s of shards) crescent(buf, ax, ay, s.a, s.r + s.v * (t - 2 / 60), s.arc * (1 - 0.4 * k), k < 0.4 ? C[2]  : k < 0.7 ? C[3]  : C[4] , 1 - k);
      }
      if (f >= 3 && t < 0.2) {
        const k = (t - 2 / 60) / (0.2 - 2 / 60), r = (8 + 12 * (1 - Math.pow(1 - k, 3))) * S, th = Math.max(1, 2 * (1 - k) * S), col = k < 0.3 ? C[1]  : k < 0.6 ? C[2]  : C[3] ;
        for (let j = 0, n = Math.ceil(r * TAU * 1.3); j < n; j++) {
          const a = (j / n) * TAU;
          if (!open(a)) continue;
          for (let o = -th / 2; o <= th / 2; o += 0.5) dot(buf, ax + Math.cos(a) * (r + o), ay + Math.sin(a) * (r + o), col, 1.15 - k);
        }
      }
      if (glance && t < STREAK) {
        const head = (SPEED * t) / PX + 6 * S, tail = Math.max(2, head - (40 + 220 * t) / PX), k = t / STREAK;
        for (let d = tail; d <= head; d += 0.5) {
          const u = (d - tail) / Math.max(1, head - tail);
          dot(buf, ax + tx * d, ay + ty * d, u > 0.8 ? C[0]  : u > 0.4 ? C[1]  : C[3] , u > 0.4 ? 1 : 1 - k);
        }
        light.glow(ax + tx * head, ay + ty * head, 9, C[2] , 0.6 * (1 - k));
      }
      ps.draw(buf, light, "front");
      const pop = Math.exp(-t / 0.05);
      if (pop > 0.02) { light.glow(ax, ay, 22 * S + 6, C[3] , 0.9 * pop); light.glow(ax, ay, 8 * S + 2, C[0] , 0.7 * pop); }
    },
    done: () => t > (glance ? 1.1 : 0.2) && ps.list.length === 0,
  };
}
function star(buf    , ax        , ay        , spikes                                         , S        , sc        , th        , core        , body        , inner        , rim        ) {
  for (const pass of [0, 1, 2])
    for (const s of spikes) {
      const c = Math.cos(s.a), sn = Math.sin(s.a), L = s.len * sc;
      for (let d = 0; d <= L; d += 0.5) {
        const hw0 = s.w * th * (1 - d / L) * Math.min(1, 0.5 + d / 3);
        const hw = pass === 0 ? hw0 + 0.8 : pass === 1 ? hw0 : hw0 * 0.45;
        if (pass === 2 && d > L * 0.55) break;
        for (let o = -hw; o <= hw; o += 0.5) buf.set(Math.floor(ax + c * d - sn * o), Math.floor(ay + sn * d + c * o), pass === 0 ? rim : pass === 1 ? (d < L * 0.35 ? inner : body) : core);
      }
    }
  const r = 2.4 * S * sc * Math.sqrt(th);
  buf.disc(ax, ay, r + 0.8, inner);
  buf.disc(ax, ay, r, core);
}
function crescent(buf    , ax        , ay        , a        , r        , arc        , c        , k        ) {
  const n = Math.ceil(r * arc * 2.2);
  for (let j = 0; j <= n; j++) {
    const u = j / n - 0.5, th = a + u * arc, w = 1.4 * (1 - Math.abs(u) * 2);
    for (let o = -w * 0.5; o <= w * 0.5 + 0.01; o += 0.5) dot(buf, ax + Math.cos(th) * (r + o), ay + Math.sin(th) * (r + o), c, k);
  }
}
function rgb(r        , g        , b        , a = 255) { return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255); }
function hex(h        ) { const v = parseInt(h.replace("#", ""), 16); return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255); }
function mix(c1        , c2        , t        ) {
  const u = 1 - t, ch = (c        , s        ) => (c >>> s) & 255;
  return rgb(ch(c1, 0) * u + ch(c2, 0) * t, ch(c1, 8) * u + ch(c2, 8) * t, ch(c1, 16) * u + ch(c2, 16) * t, ch(c1, 24) * u + ch(c2, 24) * t);
}
function scale(c        , k        ) {
  return rgb(Math.min(255, (c & 255) * k), Math.min(255, ((c >>> 8) & 255) * k), Math.min(255, ((c >>> 16) & 255) * k), c >>> 24);
}
function ramp(stops                   , t        ) {
  const u = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1), i = Math.floor(u);
  return mix(stops[i] , stops[i + 1] , u - i);
}
const SOOT = hex("#0d0a12");
const SMOKE_RAMP = ["#7b6f72", "#5d5660", "#433d48", "#2b2630", "#1a171e"].map(hex);
const WARM_RAMP = ["#ffffff", "#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d", "#c9281f"].map(hex);
const SMOKE = hex("#6a6278");
const PX = 2;
class Px {
  w        ; h        ; ox        ; oy        ; data             ;
  constructor(f       , data             ) { this.w = f.w; this.h = f.h; this.ox = f.ox; this.oy = f.oy; this.data = data; }
  at(x        , y        ) { x = (x - this.ox) | 0; y = (y - this.oy) | 0; return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x; }
  set(x        , y        , c        ) { const i = this.at(x, y); if (i >= 0) this.data[i] = c; }
  blend(x        , y        , c        , a        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , oa = a + ((d >>> 24) / 255) * (1 - a);
    if (oa <= 0) return;
    const k = a / oa, j = 1 - k, r = (c & 255) * k + (d & 255) * j, g = ((c >>> 8) & 255) * k + ((d >>> 8) & 255) * j, b = ((c >>> 16) & 255) * k + ((d >>> 16) & 255) * j;
    this.data[i] = ((oa * 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  add(x        , y        , c        , k        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , r = Math.min(255, (d & 255) + (c & 255) * k), g = Math.min(255, ((d >>> 8) & 255) + ((c >>> 8) & 255) * k), b = Math.min(255, ((d >>> 16) & 255) + ((c >>> 16) & 255) * k);
    this.data[i] = (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  disc(cx        , cy        , r        , c        ) {
    if (r <= 0.5) return this.set(Math.round(cx), Math.round(cy), c);
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx; if (dx * dx + dy * dy <= r2) this.set(x, y, c); }
    }
  }
  alphaDisc(cx        , cy        , r        , c        , a        ) {
    if (a <= 0.01) return;
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx; if (dx * dx + dy * dy <= r2) this.blend(x, y, c, a); }
    }
  }
  line(x0        , y0        , x1        , y1        , c        ) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 4096; n++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) (err += dy), (x0 += sx);
      if (e2 <= dx) (err += dx), (y0 += sy);
    }
  }
  glow(cx        , cy        , r        , c        , k        ) {
    if (r < 1 || k <= 0.01) return;
    const x0 = Math.max(this.ox, Math.floor(cx - r)), x1 = Math.min(this.ox + this.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(this.oy, Math.floor(cy - r)), y1 = Math.min(this.oy + this.h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / r;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / r, d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const f = 1 - Math.sqrt(d);
        this.add(x, y, c, f * f * k);
      }
    }
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayer(x        , y        ) { return (BAYER[((y & 3) << 2) | (x & 3)]  + 0.5) / 16; }
function dot(buf    , x        , y        , c        , a = 1) {
  const px = Math.floor(x), py = Math.floor(y);
  if (a >= 1 || a > bayer(px, py)) buf.set(px, py, c);
}
class Rng {
          s        ;
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a        , b        ) { return a + (b - a) * this.next(); }
  chance(p        ) { return this.next() < p; }
}
const TAU = Math.PI * 2;
function clamp(v        , a = 0, b = 1) { return v < a ? a : v > b ? b : v; }
const GRAVITY = 1900;
const PT = { SPARK: 0, CHIP: 1, DUST: 2, SMOKE: 3 }         ;
                                       
                                                                                                                                                         
class Particles {
  list         = [];
  t = 0;
  R     ;
  ground                       ;
  C                   ;
  constructor(R     , ground                       , C                   ) { this.R = R; this.ground = ground; this.C = C; }
  spawn(k    , x        , y        , vx        , vy        , life        , col = 0, size = 1, delay = 0) {
    this.list.push({ k, x, y, vx, vy, life, max: life, col, size, seed: this.R.next() * 100, delay });
  }
  update(dt        ) {
    this.t += dt;
    const t = this.t, R = this.R, L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i] ;
      if (p.delay > 0) { p.delay -= dt; continue; }
      if ((p.life -= dt) <= 0) { L.splice(i, 1); continue; }
      const g = this.ground(p.x);
      switch (p.k) {
        case PT.SPARK: {
          p.vy += GRAVITY * 0.45 * dt;
          p.vx -= p.vx * 2.2 * dt;
          p.vy -= p.vy * 2.2 * dt;
          const ny = p.y + p.vy * dt;
          p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= g && ny >= g) { p.vy = -p.vy * 0.45; p.vx *= 0.7; p.y = g - 0.5; } else p.y = ny;
          break;
        }
        case PT.CHIP: {
          p.vy += GRAVITY * dt;
          p.vx -= p.vx * 0.6 * dt;
          const ny = p.y + p.vy * dt;
          p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= g && ny >= g) {
            p.y = g - 0.5;
            if (p.vy > 220) (p.vy = -p.vy * 0.3), (p.vx = p.vx * 0.5 + R.range(-20, 20));
            else (p.vx = p.vy = 0), (p.life = Math.min(p.life, 0.5));
          } else p.y = ny;
          break;
        }
        case PT.DUST:
          p.vx -= p.vx * 4 * dt;
          p.vy -= p.vy * 4 * dt + 10 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case PT.SMOKE:
          p.vy -= 32 * dt;
          p.vx += Math.sin(t * 1.3 + p.seed) * 16 * dt;
          p.vx -= p.vx * 1.6 * dt;
          p.vy -= p.vy * 1.2 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
      }
    }
  }
  draw(buf    , light    , layer       ) {
    const C = this.C;
    for (const p of this.list) {
      if (p.delay > 0 || (p.k === PT.SPARK) === (layer === "back")) continue;
      const k = p.life / p.max, ax = p.x / PX, ay = p.y / PX, px = Math.floor(ax), py = Math.floor(ay);
      switch (p.k) {
        case PT.SPARK: {
          const hot = k > 0.6 ? C[1]  : k > 0.3 ? C[2]  : C[3] ;
          const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, len = Math.min(9, 1 + sp * 0.011);
          buf.line(ax - ux * len, ay - uy * len, ax - ux * len * 0.4, ay - uy * len * 0.4, k > 0.5 ? hot : C[4] );
          buf.line(ax - ux * len * 0.45, ay - uy * len * 0.45, ax, ay, hot);
          light.glow(ax, ay, 3, hot, 0.45 * k);
          break;
        }
        case PT.CHIP:
          if (k > 0.25 || bayer(px, py) < k * 4) {
            buf.set(px, py, p.col);
            if (p.size >= 2) (buf.set(px + 1, py, p.col), buf.set(px, py + 1, scale(p.col, 0.8)));
          }
          break;
        case PT.DUST:
          buf.alphaDisc(ax, ay, p.size * (0.6 + (1 - k) * 0.9), p.col, Math.pow(k, 1.3) * 0.7);
          break;
        case PT.SMOKE: {
          const age = 1 - k, r = p.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * 0.4);
          const a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * 0.5, c = mix(p.col, ramp(SMOKE_RAMP, age), age);
          buf.alphaDisc(ax, ay, r, c, a * 0.45);
          buf.alphaDisc(ax + r * 0.05, ay + r * 0.06, r * 0.74, c, a * 0.62);
          break;
        }
      }
    }
  }
}

window.SF_VFX.impact = impact;
})();
(() => {
// Made by Sprite Fusion, to have full context over VFX, connect to the MCP: https://www.spritefusion.com/mcp
// MIT License
// Copyright (c) 2026 Hugo Duprez
                                                                                                               
                                     
                        
                                               
                                                                                          
 
                          
                                                 
             
             
                                            
                    
                
               
                   
                   
                
                  
                
                          
                          
                    
                  
                               
                                       
                                                                                                   
                           
                                                          
 
                                                                                                                  
                                                                                                                                            
function lightning(o          = {}) {
  const R = new Rng(o.seed ?? 1), V = o.colors ?? VOLT, kind = o.kind ?? "strike";
  const groundAt = (x        ) => (o.ground === undefined ? (kind === "strike" ? 600 : Infinity) : typeof o.ground === "number" ? o.ground : o.ground(x));
  const ps = new Particles(R, groundAt, o.colors ? [V[0] , V[2] , V[4] ] : PLASMA), lights          = [];
  const c      = { o, R, V, ps, lights, groundAt };
  const run = kind === "impact" ? impact(c) : kind === "arc" ? arc(c) : kind === "crackle" ? crackle(c) : strike(c);
  return {
    update(dt        ) { run.update(dt); ps.update(dt); stepLights(lights, dt); },
    draw(f       , layer        ) {
      const buf = new Px(f, f.color), light = new Px(f, f.light);
      if (layer !== "front") { run.back?.(buf, light); ps.draw(buf, light, "back"); }
      if (layer !== "back") { run.front(buf, light); ps.draw(buf, light, "front"); drawLights(light, lights); }
    },
    stop: () => run.stop?.(),
    done: () => run.over() && ps.list.length === 0 && lights.length === 0,
  };
}
function strike({ o, R, V, ps, lights, groundAt }     )      {
  const X = o.x ?? 790, G = groundAt(X), cx = X / PX, cy = G / PX, TOP = (o.top ?? G - 408) / PX;
  const strokes = [
    { t: 0.62, k: 1, b: bolt(R, cx + 18, TOP, cx, cy, 0.2, 0.75) },
    { t: 1.02, k: 0.85, b: bolt(R, cx - 14, TOP, cx + 1, cy, 0.2, 0.6) },
    { t: 1.36, k: 0.55, b: bolt(R, cx + 6, TOP, cx, cy, 0.24, 0.4) },
  ].slice(0, Math.max(1, Math.min(3, o.strokes ?? 3)));
  const LEAD = 0.42;
  const clouds = Array.from({ length: 24 }, (_, i) => ({ x: (X - 490) / PX + i * 15 + hash(i, 1) * 8, y: TOP + 22 + hash(i, 2) * 10, r: 12 + hash(i, 3) * 10 }));
  const crawls                           = [];
  let t = 0, struck = -1, flash = 0;
  const now = () => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i] , a = t - s.t;
      if (a < 0) continue;
      const f = a < 0.03 ? 1 : a < 0.06 ? 0.55 : a < 0.1 ? 0.95 : a < 0.14 ? 0.4 : a < 0.17 ? 0.7 : 0;
      return { s, a, k: f * s.k };
    }
    return null;
  };
  return {
    update(dt) {
      t += dt;
      o.darken?.(0.55 * smooth(-0.3, 0.35, t) * (1 - smooth(2.1, 2.9, t)) * (1 - 0.7 * flash));
      flash = Math.max(0, flash - dt * 6);
      for (const [i, s] of strokes.entries()) {
        if (struck >= i || t < s.t) continue;
        struck = i;
        flash = s.k;
        o.flash?.(s.k, "225,236,255");
        o.shake?.(0.5 * s.k);
        o.ripple?.(X, G - 4, 20, 260 * s.k, 0.5, 0.18 * s.k, 22);
        const n = Math.round(60 * s.k);
        for (let j = 0; j < n; j++) {
          const a = -Math.PI / 2 + R.range(-1.4, 1.4), sp = R.range(240, 980) * s.k;
          ps.spawn(j % 3 ? K.PLASMA : K.SPARK, X, G - 3, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.7));
        }
        for (let j = 0; j < 5; j++) ps.spawn(K.SMOKE, X + R.range(-12, 12), G - 6, R.range(-20, 20), R.range(-50, -20), R.range(1.4, 2.4), mix(SMOKE_TINT, V[5] , 0.3), R.range(3, 6), R.range(0.1, 0.5));
        dust(ps, R, X, G, 8, 1.6);
        lights.push({ x: X, y: G - 60, r: 320, color: V[4] , k: 0.7 * s.k, life: 0.3, max: 0.3 });
      }
      if (struck >= 0 && R.chance(0.6 * clamp(1 - (t - strokes[struck] .t) / 0.4))) {
        const side = R.sign(), l = R.range(10, 28);
        crawls.push({ b: bolt(R, cx + side * R.range(1, 4), cy - 0.5, cx + side * l, cy - R.range(0, 2), 0.35, 0.2, 0.6), t });
      }
      for (let i = crawls.length - 1; i >= 0; i--) if (t - crawls[i] .t > 0.08) crawls.splice(i, 1);
      if (t > strokes[0] .t && t < 2.6 && R.chance(0.12)) ps.spawn(K.SMOKE, X + R.range(-10, 10), G - 2, R.range(-8, 8), R.range(-34, -18), R.range(1.4, 2.2), 0, R.range(2, 3.5));
    },
    back(buf, light) {
      const first = strokes[0] , s = now();
      if (struck >= 0) scorch(buf, light, cx, cy, 20, Math.pow(clamp(1 - (t - first.t) / 2.2), 1.3));
      if (o.clouds !== false) {
        const lead = t > first.t - LEAD && t < first.t ? 0.35 + 0.35 * Math.sin(t * 50) : 0;
        const lit = Math.max(s?.k ?? 0, lead * 0.5, Math.max(0, Math.sin(t * 9 + 1)) * 0.2 * smooth(0, 0.3, t) * (t < 0.5 ? 1 : 0));
        storm(buf, light, clouds, cx, lit, t, V);
      }
    },
    front(buf, light) {
      const first = strokes[0] , s = now();
      if (t > first.t - LEAD && t < first.t) {
        const reach = TOP + (cy - TOP) * Math.pow(Math.floor(((t - first.t + LEAD) / LEAD) * 9) / 9, 1.3);
        for (const p of first.b.paths)
          for (let i = 0; i < p.pts.length - 1; i++) {
            const [ax, ay] = p.pts[i] , [bx, by] = p.pts[i + 1] ;
            if (by > reach) break;
            buf.line(ax, ay, bx, by, p.w >= 1 ? V[3]  : V[5] );
            if (i % 4 === 0) light.glow(ax, ay, 6, V[4] , 0.25);
          }
      }
      if (s && s.k > 0) {
        stroke(buf, light, s.s.b, s.k, V, 1);
        buf.disc(cx, cy - 1, 4 * s.k + 1.5, V[5] );
        buf.disc(cx, cy - 1, 4 * s.k + 0.5, V[2] );
        buf.disc(cx, cy - 1, 2.6 * s.k, V[0] );
        light.glow(cx, cy - 10, 110, V[4] , 0.55 * s.k);
        light.glow(cx, cy - 4, 26, V[2] , 0.45 * s.k);
      } else if (s && s.a < 0.45) {
        const k = 1 - (s.a - 0.17) / 0.28;
        for (const p of s.s.b.paths) if (p.w >= 1) for (const [x, y] of p.pts) dot(buf, x, y, V[5] , k * 0.8);
      }
      for (const c of crawls) drawBolt(buf, light, c.b, V, 1 - (t - c.t) / 0.1, 0.4);
      if (struck >= 0) light.glow(cx, cy - 2, 20, V[3] , 0.35 * clamp(1 - (t - first.t) / 1.5));
    },
    over: () => t > 3,
  };
}
function impact({ o, R, V, ps }     )      {
  const X = o.x ?? 780, Y = o.y ?? 524, S = o.size ?? 1, ax = X / PX, ay = Y / PX;
  let star         = [], starAt = -1, t = 0;
  const arcs                           = [];
  o.flash?.(0.7, "200,226,255");
  o.shake?.(0.4 * Math.min(1.5, S));
  for (let i = 0; i < (o.sparks ?? 64); i++) {
    const a = R.range(0, TAU), sp = R.range(240, 900) * Math.sqrt(S);
    ps.spawn(K.PLASMA, X, Y, Math.cos(a) * sp, Math.sin(a) * sp - 100, R.range(0.2, 0.75));
  }
  for (let i = 0; i < 5; i++) ps.spawn(K.SMOKE, X + R.range(-14, 14) * S, Y + R.range(-10, 10) * S, R.range(-10, 10), R.range(-30, -12), R.range(1.2, 2), mix(SMOKE_TINT, V[4] , 0.35), R.range(3, 5) * S, R.range(0.08, 0.25));
  return {
    update(dt) {
      t += dt;
      const f = Math.floor(t * 30);
      if (t < 0.3 && f !== starAt) {
        starAt = f;
        const len = t < 0.07 ? outBack(t / 0.07, 2.2) : 1 - (t - 0.07) / 0.3;
        star = [];
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU + hash(i, 3) * 0.6 + R.range(-0.12, 0.12), L = (18 + 18 * hash(i, 5)) * Math.max(0.15, len) * S;
          star.push(bolt(R, ax, ay, ax + Math.cos(a) * L, ay + Math.sin(a) * L, 0.28, 0.5));
        }
      }
      if (t > 0.04 && t < 0.9 && R.chance(0.5 * (1 - t / 0.9))) {
        const a = R.range(0, TAU), d = R.range(6, 26) * S, a2 = a + R.range(-1.4, 1.4), l = R.range(6, 14) * S;
        const x0 = ax + Math.cos(a) * d, y0 = ay + Math.sin(a) * d;
        arcs.push({ b: bolt(R, x0, y0, x0 + Math.cos(a2) * l, y0 + Math.sin(a2) * l, 0.4, 0.2, 0.6), t });
        if (R.chance(0.4)) ps.spawn(K.PLASMA, x0 * PX, y0 * PX, R.range(-200, 200), R.range(-260, 40), R.range(0.12, 0.3));
      }
      for (let i = arcs.length - 1; i >= 0; i--) if (t - arcs[i] .t > 0.07) arcs.splice(i, 1);
    },
    front(buf, light) {
      if (t < 0.05) { buf.disc(ax, ay, (10 - t * 60) * S, V[3] ); buf.disc(ax, ay, (8 - t * 60) * S, V[1] ); buf.disc(ax, ay, (6 - t * 50) * S, V[0] ); }
      if (t < 0.32) {
        const k = t / 0.32, r = (4 + 34 * (1 - Math.pow(1 - k, 3))) * S;
        buf.ring(ax, ay, r, Math.max(1, 3 * (1 - k)), k < 0.4 ? V[1]  : V[3] , 1.2 - k);
      }
      if (t < 0.3) for (const b of star) drawBolt(buf, light, b, V, 1 - t / 0.36, 0.6);
      for (const a of arcs) drawBolt(buf, light, a.b, V, 1 - (t - a.t) / 0.1, 0.35);
      if (t > 0.15 && t < 1.5)
        for (let i = 0; i < 10 * (1 - t / 1.5); i++) {
          const s = Math.floor(t * 40) * 13 + i, a = hash(s, 1) * TAU, d = (4 + hash(s, 2) * 30) * S;
          const x = ax + Math.cos(a) * d, y = ay + Math.sin(a) * d;
          dot(buf, x, y, hash(s, 3) < 0.3 ? V[0]  : V[2] );
          if (hash(s, 4) < 0.4) dot(buf, x + (hash(s, 5) < 0.5 ? 1 : -1), y + 1, V[3] );
        }
      const strobe = t < 0.3 ? (Math.floor(t * 60) % 2 ? 0.7 : 1) : 0.5 + 0.5 * Math.sin(t * 70);
      light.glow(ax, ay, 70 * S * Math.max(0, 1 - t / 1.7), V[3] , 0.9 * Math.exp(-t * 4) * strobe);
      light.glow(ax, ay, 26 * S, V[0] , 0.9 * Math.exp(-t * 9));
    },
    over: () => t > 1.6,
  };
}
function arc({ o, R, V, ps, lights, groundAt }     )      {
  const hops = o.to ?? [[640, 600], [760, 600], [880, 600]];
  const D = o.duration ?? 0.9, LINK = 0.05;
  const src = ()                   => { const h = o.actor?.hand?.(); return h ? [h.x, h.y] : (o.from ?? [o.x ?? 520, o.y ?? 520]); };
  const links = hops.map((_, i) => ({ on: i * LINK, hit: false, b: null                }));
  const crawls                           = [], marks                                        = [];
  let t = 0, at = -1, stopAt = D;
  const level = () => {
    const flick = t < 0.12 ? (Math.floor(t * 60) % 3 === 1 ? 0.6 : 1) : 0.8 + 0.2 * Math.sin(t * 61) * Math.sin(t * 23);
    return t < stopAt ? flick : flick * clamp(1 - (t - stopAt) / 0.18);
  };
  const pointsNow = () => [src(), ...hops]                      ;
  return {
    update(dt) {
      t += dt;
      const P = pointsNow(), k = level(), f = Math.floor(t * 30);
      for (const [i, l] of links.entries()) {
        if (l.hit || t < l.on) continue;
        l.hit = true;
        const [x, y] = P[i + 1] , g = groundAt(x), onGround = Math.abs(g - y) < 8;
        for (let j = 0; j < 14; j++) {
          const a = (onGround ? -Math.PI / 2 : 0) + R.range(-1.4, 1.4) + (onGround ? 0 : R.range(0, TAU)), sp = R.range(200, 620);
          ps.spawn(K.PLASMA, x, y - 2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.45));
        }
        if (onGround) { dust(ps, R, x, g, 4, 0.9); marks.push({ x, y: g, t }); }
        lights.push({ x, y, r: 120, color: V[3] , k: 0.8, life: 0.2, max: 0.2 });
        if (i === 0) { o.flash?.(0.35, "215,232,255"); o.shake?.(0.2); } else o.shake?.(0.08);
      }
      if (f !== at && k > 0) {
        at = f;
        for (const [i, l] of links.entries()) {
          if (!l.hit) continue;
          const [x0, y0] = P[i] , [x1, y1] = P[i + 1] , g0 = Math.abs(groundAt(x0) - y0) < 8, g1 = Math.abs(groundAt(x1) - y1) < 8;
          l.b = g0 && g1 ? hop(R, x0 / PX, y0 / PX, x1 / PX, y1 / PX) : bolt(R, x0 / PX, y0 / PX, x1 / PX, y1 / PX, 0.22, 0.45);
        }
      }
      if (k > 0.3) {
        for (const [i, l] of links.entries()) {
          if (!l.hit || !R.chance(0.3)) continue;
          const [x, y] = P[i + 1] , a = R.range(0, TAU), d = R.range(4, 14);
          crawls.push({ b: bolt(R, x / PX, y / PX, x / PX + Math.cos(a) * d, y / PX + Math.sin(a) * d * (Math.abs(groundAt(x) - y) < 8 ? 0.3 : 1), 0.4, 0.2, 0.6), t });
        }
        if (R.chance(0.5)) {
          const i = R.int(0, links.length - 1), u = R.next(), [x0, y0] = P[i] , [x1, y1] = P[i + 1] ;
          if (links[i] .hit) ps.spawn(K.PLASMA, lerp(x0, x1, u), lerp(y0, y1, u), R.range(-120, 120), R.range(-160, 40), R.range(0.1, 0.25));
        }
      }
      for (let i = crawls.length - 1; i >= 0; i--) if (t - crawls[i] .t > 0.07) crawls.splice(i, 1);
    },
    back(buf, light) { for (const m of marks) scorch(buf, light, m.x / PX, m.y / PX, 6, Math.pow(clamp(1 - (t - m.t) / 1.6), 1.3)); },
    front(buf, light) {
      const P = pointsNow(), k = level();
      if (k > 0) {
        for (const l of links) if (l.hit && l.b) stroke(buf, light, l.b, k, V, 0.7);
        for (const [i, l] of links.entries()) {
          if (!l.hit) continue;
          const [x, y] = P[i + 1] , ax = x / PX, ay = y / PX, r = (2.2 + Math.sin(t * 47 + i) * 0.6) * k;
          buf.disc(ax, ay, r + 1.4, V[5] );
          buf.disc(ax, ay, r + 0.6, V[2] );
          buf.disc(ax, ay, r * 0.6, V[0] );
          light.glow(ax, ay, 20, V[3] , 0.5 * k);
        }
        const [hx, hy] = P[0] , hr = (2 + Math.sin(t * 53) * 0.5) * k;
        buf.disc(hx / PX, hy / PX, hr + 1, V[3] );
        buf.disc(hx / PX, hy / PX, hr, V[0] );
        light.glow(hx / PX, hy / PX, 16, V[2] , 0.6 * k);
      } else if (t - stopAt < 0.45) {
        const g = 1 - (t - stopAt - 0.18) / 0.27;
        for (const l of links) if (l.b) for (const p of l.b.paths) if (p.w >= 1) for (const [x, y] of p.pts) dot(buf, x, y, V[5] , g * 0.7);
      }
      for (const c of crawls) drawBolt(buf, light, c.b, V, 1 - (t - c.t) / 0.09, 0.3);
    },
    over: () => t > stopAt + 1.7,
    stop() { stopAt = Math.min(stopAt, t); },
  };
}
function hop(R     , x0        , y0        , x1        , y1        )       {
  const mx = (x0 + x1) / 2 + R.range(-4, 4), my = Math.min(y0, y1) - Math.hypot(x1 - x0, y1 - y0) * R.range(0.16, 0.28);
  const a = bolt(R, x0, y0, mx, my, 0.2, 0.4), b = bolt(R, mx, my, x1, y1, 0.2, 0.4);
  return { paths: [{ pts: [...a.paths[0] .pts, ...b.paths[0] .pts.slice(1)], w: 1 }, ...a.paths.slice(1), ...b.paths.slice(1)] };
}
function crackle({ o, R, V, ps, groundAt }     )      {
  const D = o.duration ?? 1.8, RAD = (o.radius ?? 36) / PX;
  const arcs                                         = [];
  let t = 0, at = -1, stopAt = D, shock = 0, nextShock = 0.12, edge                     = [], centre                   = [0, 0];
  const level = () => smooth(0, 0.08, t) * (t < stopAt ? 1 : clamp(1 - (t - stopAt) / 0.3));
  const outline = () => {
    const s = o.actor?.silhouette?.();
    edge = [];
    if (s) {
      const on = (x        , y        ) => x >= 0 && y >= 0 && x < s.w && y < s.h && s.data[y * s.w + x]  >>> 24 > 0;
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (on(x, y) && (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1))) edge.push([s.x + x + 0.5, s.y + y + 0.5]);
    }
    if (!edge.length) {
      const cx = (o.x ?? 640) / PX, cy = (o.y ?? 540) / PX;
      for (let i = 0; i < 48; i++) { const a = R.range(0, TAU), d = RAD * Math.sqrt(R.next()); edge.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); }
    }
    let sx = 0, sy = 0;
    for (const [x, y] of edge) (sx += x), (sy += y);
    centre = [sx / edge.length, sy / edge.length];
  };
  return {
    update(dt) {
      t += dt;
      shock = Math.max(0, shock - dt);
      const f = Math.floor(t * 30), k = level();
      if (f !== at && f % 2 === 0 && k > 0.05 && t < stopAt) {
        at = f;
        outline();
        for (let n = 0; n < 2 + R.int(0, 1); n++) {
          const a = R.pick(edge), ux = a[0] - centre[0], uy = a[1] - centre[1], l = Math.hypot(ux, uy) || 1;
          const ang = Math.atan2(uy / l, ux / l) + R.range(-1.2, 1.2), d = R.range(6, 15);
          let b                   = [a[0] + Math.cos(ang) * d, a[1] + Math.sin(ang) * d];
          for (let tries = 0; tries < 10; tries++) {
            const c = R.pick(edge);
            if (Math.hypot(c[0] - b[0], c[1] - b[1]) < 4 && Math.hypot(c[0] - a[0], c[1] - a[1]) > 4) b = c;
          }
          arcs.push({ b: bolt(R, a[0], a[1], b[0], b[1], 0.42, 0.35), t, life: R.range(0.05, 0.09) });
          if (R.chance(0.4)) ps.spawn(K.PLASMA, b[0] * PX, b[1] * PX, R.range(-140, 140), R.range(-200, 20), R.range(0.1, 0.25));
        }
        const low = edge.reduce((m, p) => (p[1] > m[1] ? p : m), edge[0] ), g = groundAt(low[0] * PX) / PX;
        if (R.chance(0.25) && g - low[1] < 14) arcs.push({ b: bolt(R, low[0], low[1], low[0] + R.range(-9, 9), g - 0.5, 0.45, 0.3), t, life: 0.07 });
      }
      if (t >= nextShock && t < stopAt) {
        nextShock = t + R.range(0.5, 0.8);
        shock = 0.05;
        o.cue?.("hurt", { t: 0.04 });
        o.shake?.(0.05);
        for (let i = 0; i < 6; i++) {
          const a = R.range(0, TAU), sp = R.range(150, 400), [x, y] = R.pick(edge);
          ps.spawn(K.PLASMA, x * PX, y * PX, Math.cos(a) * sp, Math.sin(a) * sp - 60, R.range(0.1, 0.3));
        }
      }
      for (let i = arcs.length - 1; i >= 0; i--) if (t - arcs[i] .t > arcs[i] .life) arcs.splice(i, 1);
    },
    front(buf, light) {
      const k = level();
      for (const a of arcs) stroke(buf, light, a.b, Math.max(0.35, (1 - (t - a.t) / (a.life + 0.04)) * k), V, 0.45);
      if (k > 0.02) light.glow(centre[0], centre[1], 34, V[3] , (0.18 + 0.12 * Math.sin(t * 57) + (shock > 0 ? 0.35 : 0)) * k);
    },
    over: () => t > stopAt + 0.4 && arcs.length === 0,
    stop() { stopAt = Math.min(stopAt, t); },
  };
}
function stroke(buf    , light    , b      , k        , V          , s        ) {
  for (const pass of [0, 1, 2])
    for (const p of b.paths) {
      const trunk = p.w >= 1;
      if (!trunk && (k < 0.5 || (pass === 2 && p.w < 0.5))) continue;
      for (let i = 0; i < p.pts.length - 1; i++) {
        const [ax, ay] = p.pts[i] , [bx, by] = p.pts[i + 1] , l = Math.max(1, Math.hypot(bx - ax, by - ay));
        for (let d = 0; d <= l; d += 0.5) {
          const x = ax + ((bx - ax) * d) / l, y = ay + ((by - ay) * d) / l;
          if (pass === 0) buf.disc(x, y, (trunk ? (k > 0.6 ? 2.1 : 1.6) : 1.1) * s, V[5] );
          else if (pass === 1) buf.disc(x, y, (trunk ? (k > 0.6 ? 1.3 : 0.8) : 0.5) * s, trunk ? V[2]  : V[3] );
          else if (trunk && k > 0.3) buf.set(Math.floor(x), Math.floor(y), V[0] );
        }
        if (pass === 0 && i % 3 === 0) light.glow(ax, ay, (trunk ? 14 : 7) * s, V[3] , 0.5 * k * p.w);
      }
    }
}
function storm(buf    , light    , clouds                                       , cx        , lit        , t        , V          ) {
  const body = hex("#0f0c1d"), under = hex("#1b1631"), rim = hex("#29224a");
  for (let x = buf.ox; x < buf.ox + buf.w; x++) {
    let yb = -1e9, yb2 = -1e9;
    for (const [i, c] of clouds.entries()) {
      const dx = x + 0.5 - (c.x + noise(t * 0.4 + c.x, 9) * 2);
      if (Math.abs(dx) >= c.r) continue;
      const y = c.y + Math.sqrt(c.r * c.r - dx * dx);
      if (y > yb) yb = y;
      const y2 = c.y - 9 + (i % 3) * 2 + Math.sqrt(c.r * c.r - dx * dx) * 0.7;
      if (i % 2 && y2 > yb2) yb2 = y2;
    }
    if (yb < -1e8) continue;
    const l = lit * Math.max(0, 1 - Math.abs(x - cx) / 120);
    for (let y = buf.oy; y < yb; y++) buf.set(x, y, body);
    dot(buf, x, yb, body, 0.5);
    dot(buf, x, yb + 1, body, 0.25);
    dot(buf, x, yb - 1, l > 0.55 ? V[3]  : l > 0.2 ? V[5]  : rim);
    dot(buf, x, yb - 2, l > 0.55 ? V[5]  : under, 0.85);
    dot(buf, x, yb - 3, under, 0.45);
    if (yb2 > -1e8 && yb2 < yb - 4) { dot(buf, x, yb2, l > 0.4 ? V[5]  : under, 0.9); dot(buf, x, yb2 - 1, under, 0.4); }
    if ((x & 7) === 0 && l > 0.05) light.glow(x, yb - 2, 22, V[4] , 0.3 * l);
  }
}
function scorch(buf    , light    , cx        , cy        , rx        , T0        ) {
  const ry = Math.max(2.5, rx * 0.09);
  for (let y = Math.floor(cy); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      const k = hash(x * 31 + y * 7);
      const T = T0 * (1.25 - d) - k * 0.35;
      if (T > 0.06) {
        const c = HEAT_RAMP[Math.min(HEAT_RAMP.length - 1, Math.floor((1 - Math.min(1, T)) * (HEAT_RAMP.length - 1)))] ;
        buf.set(x, y, c);
        if ((x & 3) === 0) light.glow(x + 0.5, y, 6, c, 0.18 * T);
      } else if (d < 0.95 - k * 0.3 || bayer(x, y) < 1 - d) buf.set(x, y, d < 0.5 ? SOOT : SOOT2);
    }
}
const SOOT = hex("#0d0a12"), SOOT2 = hex("#17121d");
function dust(ps           , R     , x        , y        , n        , spread        ) {
  for (let i = 0; i < n; i++) ps.spawn(K.DUST, x + R.range(-3, 3), y - 1, R.sign() * R.range(20, 110) * spread, -R.range(5, 45), R.range(0.3, 0.65), DUST, R.range(1.3, 2.8));
}
const PX = 2;
class Px {
  w        ; h        ; ox        ; oy        ; data             ;
  constructor(f       , data             ) { this.w = f.w; this.h = f.h; this.ox = f.ox; this.oy = f.oy; this.data = data; }
  at(x        , y        ) { x = (x - this.ox) | 0; y = (y - this.oy) | 0; return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x; }
  set(x        , y        , c        ) { const i = this.at(x, y); if (i >= 0) this.data[i] = c; }
  blend(x        , y        , c        , a        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , oa = a + ((d >>> 24) / 255) * (1 - a);
    if (oa <= 0) return;
    const k = a / oa, j = 1 - k, r = (c & 255) * k + (d & 255) * j, g = ((c >>> 8) & 255) * k + ((d >>> 8) & 255) * j, b = ((c >>> 16) & 255) * k + ((d >>> 16) & 255) * j;
    this.data[i] = ((oa * 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  add(x        , y        , c        , k        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , r = Math.min(255, (d & 255) + (c & 255) * k), g = Math.min(255, ((d >>> 8) & 255) + ((c >>> 8) & 255) * k), b = Math.min(255, ((d >>> 16) & 255) + ((c >>> 16) & 255) * k);
    this.data[i] = (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  disc(cx        , cy        , r        , c        ) {
    if (r <= 0.5) return this.set(Math.round(cx), Math.round(cy), c);
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx; if (dx * dx + dy * dy <= r2) this.set(x, y, c); }
    }
  }
  alphaDisc(cx        , cy        , r        , c        , a        ) {
    if (a <= 0.01) return;
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx; if (dx * dx + dy * dy <= r2) this.blend(x, y, c, a); }
    }
  }
  ring(cx        , cy        , r        , thick        , c        , alpha = 1) {
    const ro = r + thick * 0.5, ri = Math.max(0, r - thick * 0.5), ro2 = ro * ro, ri2 = ri * ri;
    for (let y = Math.floor(cy - ro); y <= Math.ceil(cy + ro); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - ro); x <= Math.ceil(cx + ro); x++) {
        const dx = x + 0.5 - cx, d2 = dx * dx + dy * dy;
        if (d2 <= ro2 && d2 >= ri2 && (alpha >= 1 || alpha > bayer(x, y))) this.set(x, y, c);
      }
    }
  }
  line(x0        , y0        , x1        , y1        , c        ) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 4096; n++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) (err += dy), (x0 += sx);
      if (e2 <= dx) (err += dx), (y0 += sy);
    }
  }
  glow(cx        , cy        , r        , c        , k        ) {
    if (r < 1 || k <= 0.01) return;
    const x0 = Math.max(this.ox, Math.floor(cx - r)), x1 = Math.min(this.ox + this.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(this.oy, Math.floor(cy - r)), y1 = Math.min(this.oy + this.h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / r;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / r, d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const f = 1 - Math.sqrt(d);
        this.add(x, y, c, f * f * k);
      }
    }
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayer(x        , y        ) { return (BAYER[((y & 3) << 2) | (x & 3)]  + 0.5) / 16; }
function dot(buf    , x        , y        , c        , a = 1) {
  const px = Math.floor(x), py = Math.floor(y);
  if (a >= 1 || a > bayer(px, py)) buf.set(px, py, c);
}
function rgb(r        , g        , b        , a = 255) { return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255); }
function hex(h        ) { const v = parseInt(h.replace("#", ""), 16); return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255); }
function mix(c1        , c2        , t        ) {
  const u = 1 - t, ch = (c        , s        ) => (c >>> s) & 255;
  return rgb(ch(c1, 0) * u + ch(c2, 0) * t, ch(c1, 8) * u + ch(c2, 8) * t, ch(c1, 16) * u + ch(c2, 16) * t, ch(c1, 24) * u + ch(c2, 24) * t);
}
function ramp(stops                   , t        ) {
  const u = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1), i = Math.floor(u);
  return mix(stops[i] , stops[i + 1] , u - i);
}
const VOLT = ["#ffffff", "#e9f8ff", "#a3dcff", "#5eb0ff", "#5b6cff", "#4733c4", "#2a1b78"].map(hex);
const PLASMA = ["#ffffff", "#7ff3ff", "#1ab8e6"].map(hex);
const SPARKS = ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"].map(hex);
const HEAT_RAMP = ["#ffffff", "#fff3a6", "#ffe26b", "#ffc23d", "#ff8a2a", "#f2561d", "#c9281f", "#8a1f17", "#4f1a13", "#2a120e"].map(hex);
const SMOKE_RAMP = ["#7b6f72", "#5d5660", "#433d48", "#2b2630", "#1a171e"].map(hex);
const SMOKE_TINT = hex("#5b5566");
const DUST = hex("#7a6e8e");
class Rng {
          s        ;
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a        , b        ) { return a + (b - a) * this.next(); }
  int(a        , b        ) { return Math.floor(this.range(a, b + 1)); }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  chance(p        ) { return this.next() < p; }
  pick   (a              )    { return a[Math.floor(this.next() * a.length)] ; }
}
const TAU = Math.PI * 2;
function clamp(v        , a = 0, b = 1) { return v < a ? a : v > b ? b : v; }
function lerp(a        , b        , t        ) { return a + (b - a) * t; }
function smooth(a        , b        , x        ) { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }
function outBack(t        , s = 1.7) { const u = clamp(t) - 1; return 1 + (s + 1) * u * u * u + s * u * u; }
function hash(n        , k = 0) { return ((Math.imul(n + 1 + k * 7919, 2654435761) >>> 0) % 100000) / 100000; }
function noise(x        , seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u);
}
const GRAVITY = 1900;
const K = { SPARK: 0, PLASMA: 1, SMOKE: 2, DUST: 3 }         ;
                                    
                                                                                                                                                     
class Particles {
  list      = [];
  t = 0;
  R     ;
  ground                       ;
  plasma          ;
  constructor(R     , ground                       , plasma          ) { this.R = R; this.ground = ground; this.plasma = plasma; }
  spawn(k   , x        , y        , vx        , vy        , life        , col = 0, size = 1, delay = 0) {
    this.list.push({ k, x, y, vx, vy, life, max: life, col, size, seed: this.R.next() * 100, delay });
  }
  update(dt        ) {
    this.t += dt;
    const t = this.t, L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i] ;
      if (p.delay > 0) { p.delay -= dt; continue; }
      if ((p.life -= dt) <= 0) { L.splice(i, 1); continue; }
      switch (p.k) {
        case K.SPARK:
        case K.PLASMA: {
          p.vy += GRAVITY * 0.45 * dt;
          p.vx -= p.vx * 2.2 * dt;
          p.vy -= p.vy * 2.2 * dt;
          const g = this.ground(p.x), ny = p.y + p.vy * dt;
          p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= g && ny >= g) { p.vy = -p.vy * 0.45; p.vx *= 0.7; p.y = g - 0.5; } else p.y = ny;
          break;
        }
        case K.SMOKE:
          p.vy -= 32 * dt;
          p.vx += Math.sin(t * 1.3 + p.seed) * 16 * dt;
          p.vx -= p.vx * 1.6 * dt;
          p.vy -= p.vy * 1.2 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case K.DUST:
          p.vx -= p.vx * 4 * dt;
          p.vy -= p.vy * 4 * dt + 10 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
      }
    }
  }
  draw(buf    , light    , layer       ) {
    const back = layer === "back";
    for (const p of this.list) if (p.delay <= 0 && (p.k === K.SMOKE || p.k === K.DUST) === back) this.drawOne(p, buf, light);
  }
          drawOne(p   , buf    , light    ) {
    const k = p.life / p.max, ax = p.x / PX, ay = p.y / PX;
    switch (p.k) {
      case K.SMOKE: {
        const age = 1 - k, r = p.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * 0.4);
        const a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * 0.58;
        const c = p.col ? mix(p.col, ramp(SMOKE_RAMP, age), age) : ramp(SMOKE_RAMP, age * 1.05);
        buf.alphaDisc(ax, ay, r, c, a * 0.45);
        buf.alphaDisc(ax + r * 0.05, ay + r * 0.06, r * 0.74, c, a * 0.62);
        if (age < 0.5) buf.alphaDisc(ax - r * 0.22, ay - r * 0.3, r * 0.5, mix(c, VOLT[0] , 0.12), a * 0.4 * (1 - age * 2));
        break;
      }
      case K.DUST:
        buf.alphaDisc(ax, ay, p.size * (0.6 + (1 - k) * 0.9), p.col, Math.pow(k, 1.3) * 0.7);
        break;
      case K.SPARK:
      case K.PLASMA: {
        const C = p.k === K.PLASMA ? this.plasma : SPARKS, hot = p.k === K.PLASMA ? (k > 0.5 ? C[0]  : k > 0.25 ? C[1]  : C[2] ) : k > 0.6 ? C[0]  : k > 0.3 ? C[1]  : C[2] ;
        const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, len = Math.min(9, 1 + sp * 0.011);
        buf.line(ax - ux * len, ay - uy * len, ax - ux * len * 0.4, ay - uy * len * 0.4, k > 0.5 ? hot : C[C.length - 1] );
        buf.line(ax - ux * len * 0.45, ay - uy * len * 0.45, ax, ay, hot);
        light.glow(ax, ay, 3, hot, 0.45 * k);
        break;
      }
    }
  }
}
                                                                                                        
function stepLights(lights         , dt        ) { for (let i = lights.length - 1; i >= 0; i--) if ((lights[i] .life -= dt) <= 0) lights.splice(i, 1); }
function drawLights(light    , lights         ) {
  for (const l of lights) { const k = l.life / l.max; light.glow(l.x / PX, l.y / PX, (l.r / PX) * (0.55 + 0.45 * k), l.color, l.k * k * k); }
}
                                                                  
function bolt(R     , x0        , y0        , x1        , y1        , jag = 0.32, forks = 0.35, w = 1, depth = 0)       {
  const out       = { paths: [] }, L = Math.hypot(x1 - x0, y1 - y0);
  let pts                     = [[x0, y0], [x1, y1]], off = L * jag;
  while (pts.length < 2 + L / 3) {
    const nxt                     = [pts[0] ];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i] , [bx, by] = pts[i + 1] , l = Math.hypot(bx - ax, by - ay) || 1, o = R.range(-off, off);
      nxt.push([(ax + bx) / 2 + (-(by - ay) / l) * o, (ay + by) / 2 + ((bx - ax) / l) * o], [bx, by]);
    }
    pts = nxt;
    off *= 0.52;
  }
  out.paths.push({ pts, w });
  if (depth < 2)
    for (let i = 2; i < pts.length - 3; i++)
      if (R.chance(forks / (1 + depth) / Math.max(4, pts.length / 6))) {
        const [ax, ay] = pts[i] , [bx, by] = pts[Math.min(pts.length - 1, i + 3)] ;
        const a = Math.atan2(by - ay, bx - ax) + R.sign() * R.range(0.35, 0.9), l = (L - (i / pts.length) * L) * R.range(0.25, 0.55);
        out.paths.push(...bolt(R, ax, ay, ax + Math.cos(a) * l, ay + Math.sin(a) * l, jag * 1.1, forks, w * 0.55, depth + 1).paths);
      }
  return out;
}
function drawBolt(buf    , light    , b      , V          , k = 1, glowK = 0.5) {
  for (const p of b.paths) {
    const thick = p.w >= 1;
    for (let i = 0; i < p.pts.length - 1; i++) {
      const [ax, ay] = p.pts[i] , [bx, by] = p.pts[i + 1] , l = Math.max(1, Math.hypot(bx - ax, by - ay));
      for (let d = 0; d <= l; d += 0.5) {
        const x = ax + ((bx - ax) * d) / l, y = ay + ((by - ay) * d) / l;
        if (k > 0.45 && thick) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) dot(buf, x + dx  * 1.5, y + dy  * 1.5, V[4] , (k - 0.45) * 1.6);
        if (k > 0.25 && (thick || p.w > 0.4)) for (const [dx, dy] of [[1, 0], [0, 1]]) dot(buf, x + dx , y + dy , V[2] );
        buf.set(Math.floor(x), Math.floor(y), thick && k > 0.3 ? V[0]  : V[2] );
      }
      if (i % 3 === 0) light.glow(ax, ay, (thick ? 9 : 5) * (0.5 + k * 0.5), V[3] , glowK * k * p.w);
    }
  }
}

window.SF_VFX.lightning = lightning;
})();
(() => {
// Made by Sprite Fusion, to have full context over VFX, connect to the MCP: https://www.spritefusion.com/mcp
// MIT License
// Copyright (c) 2026 Hugo Duprez
                                                                                                               
                                     
                          
             
             
                
                  
                  
                
                
              
                 
                  
                 
                
                 
                  
                           
                                
                                            
                
                               
 
function slash(o          = {}) {
  const S = o.size ?? 1, F = o.facing ?? 1, C = o.ramp ?? STEEL, R = new Rng(o.seed ?? 1);
  const groundAt = (x        ) => (o.ground === undefined ? Infinity : typeof o.ground === "number" ? o.ground : o.ground(x));
  const ps = new Particles(groundAt, o.sparkRamp ?? HOT);
  const RA = ((o.radius ?? 84) * S) / PX, a0 = o.from ?? -2.55, a1 = o.to ?? 0.95, ang = (a        ) => (F < 0 ? Math.PI - a : a);
  const A        = { cx: (o.x ?? 690) / PX, cy: (o.y ?? 530) / PX, R: RA, sy: o.squash ?? 0.6, rot: (o.tilt ?? -0.38) * F, a0: ang(a0), a1: ang(a1), W: ((o.width ?? 24) * S) / PX, t0: 0, sweep: o.sweep ?? 0.06, hold: o.hold ?? 0.06, trail: o.trail ?? 0.24, ramp: C };
  const E        = { ...A, R: RA * (33 / 42), W: RA * (4.5 / 42), a0: ang(a0 + (a1 - a0) * 0.1), a1: ang(a1 - (a1 - a0) * (0.15 / 3.5)), t0: 0.017, hold: A.hold * 0.5, trail: A.trail * (5 / 6), ramp: C.slice(1) };
  const end = slashEnd(A);
  let t = 0, landed = false;
  return {
    update(dt        ) {
      t += dt;
      if (!landed && t >= A.sweep) {
        landed = true;
        for (let i = 0; i < (o.sparks ?? 10); i++) {
          const a = Math.atan2(end.dy, end.dx) + R.range(-0.5, 0.5), sp = R.range(300, 800);
          ps.spawn(K.SPARK, end.x * PX, end.y * PX, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.35));
        }
        shavings(ps, R, A, 16, C);
        o.shake?.(0.12 * S);
      }
      ps.update(dt);
    },
    draw(f       , layer        ) {
      if (layer === "back") return;
      const buf = new Px(f, f.color), light = new Px(f, f.light);
      drawSlash(buf, light, E, t);
      drawSlash(buf, light, A, t);
      glint(buf, light, A, t, 9 * S, 0.22, C);
      if (t < 0.3) {
        const [x, y] = onArc(A.cx, A.cy, A.R - 4, A.sy, A.rot, A.a0 + (A.a1 - A.a0) * outExpo(t / A.sweep));
        light.glow(x, y, 40 * S, C[3] , 0.5 * (1 - t / 0.3));
      }
      ps.draw(buf, light);
    },
    done: () => t > 0.5 && ps.list.length === 0,
  };
}
function onArc(cx        , cy        , R        , sy        , rot        , a        )                   {
  const lx = Math.cos(a) * R, ly = Math.sin(a) * R * sy, c = Math.cos(rot), s = Math.sin(rot);
  return [cx + lx * c - ly * s, cy + lx * s + ly * c];
}
function crescent(buf    , light    , cx        , cy        , R        , sy        , rot        , ta        , L        , W        , ramp                   , age        ) {
  if (Math.abs(L) < 0.02 || W < 0.3) return;
  const dir = Math.sign(L), span = Math.abs(L), c = Math.cos(rot), s = Math.sin(rot), n = ramp.length, B = Math.ceil(R + 2);
  for (let py = Math.floor(cy - B); py <= Math.ceil(cy + B); py++)
    for (let px = Math.floor(cx - B); px <= Math.ceil(cx + B); px++) {
      const dx = px + 0.5 - cx, dy = py + 0.5 - cy;
      const lx = dx * c + dy * s, ly = (-dx * s + dy * c) / sy, r = Math.hypot(lx, ly);
      if (r > R + 0.5 || r < R - W - 1) continue;
      let u = (dir * (Math.atan2(ly, lx) - ta)) % TAU;
      if (u < 0) u += TAU;
      if (u > span) continue;
      const v = u / span, w = W * Math.pow(Math.sin(Math.PI * Math.pow(v, 2.2)), 0.6);
      if (w < 0.35) continue;
      const q = (R - r) / w;
      if (q < 0 || q > 1) continue;
      const f = Math.min(1, v / 0.4);
      if (f < 1 && f <= bayer(px, py)) continue;
      const ci = q < 0.22 && age < 0.5 ? 0 : Math.round(q * (n - 1) * 0.75 + age * 2.4 - v * 0.8 + 0.4);
      buf.set(px, py, ramp[Math.max(0, Math.min(n - 1, ci))] );
    }
  for (let u = 0; u <= span; u += 0.3) {
    const [x, y] = onArc(cx, cy, R - W * 0.4, sy, rot, ta + dir * u);
    light.glow(x, y, 5 + W, ramp[2] , 0.22 * (1 - age) * (u / span));
  }
}
                 
             
             
            
             
              
             
             
            
             
                
               
                
                          
 
function drawSlash(buf    , light    , s       , t        ) {
  const u = t - s.t0;
  if (u < 0) return;
  const head = outExpo(u / s.sweep), tail = smooth(s.sweep + s.hold, s.sweep + s.hold + s.trail, u), span = s.a1 - s.a0;
  const age = clamp(u / (s.sweep + s.hold + s.trail));
  if (tail < 1) crescent(buf, light, s.cx, s.cy, s.R, s.sy, s.rot, s.a0 + span * tail, span * (head - tail), s.W * (1 - tail * 0.55), s.ramp, age);
  const th = 0.7 * (1 - clamp((u - s.sweep - s.hold) / (s.trail + 0.2)));
  if (tail > 0.02 && th > 0)
    for (let k = 0; k <= tail; k += 0.6 / (Math.abs(span) * s.R)) {
      const a = s.a0 + span * k;
      const [x, y] = onArc(s.cx, s.cy, s.R - 0.5, s.sy, s.rot, a);
      dot(buf, x, y, s.ramp[s.ramp.length - 2] , th * (0.4 + 0.6 * k));
    }
}
function slashEnd(s       ) {
  const [x, y] = onArc(s.cx, s.cy, s.R - s.W * 0.3, s.sy, s.rot, s.a1), [x2, y2] = onArc(s.cx, s.cy, s.R - s.W * 0.3, s.sy, s.rot, s.a1 + Math.sign(s.a1 - s.a0) * 0.05);
  const l = Math.hypot(x2 - x, y2 - y) || 1;
  return { x, y, dx: (x2 - x) / l, dy: (y2 - y) / l };
}
function glint(buf    , light    , s       , t        , arm        , life        , C                   ) {
  const g = t - s.t0 - s.sweep * 0.6;
  if (g <= 0 || g >= life) return;
  const e = slashEnd(s);
  sparkle(buf, light, e.x, e.y, arm * outBack(Math.min(1, g / 0.05)) * (1 - g / life), C[1] , C[3] );
}
function shavings(ps           , R     , s       , n        , C                   ) {
  for (let i = 0; i < n; i++) {
    const a = s.a0 + (s.a1 - s.a0) * R.range(0.3, 1), [x, y] = onArc(s.cx, s.cy, s.R, s.sy, s.rot, a);
    const ox = x - s.cx, oy = y - s.cy, l = Math.hypot(ox, oy) || 1, sp = R.range(60, 200);
    ps.spawn(K.MOTE, x * PX, y * PX, (ox / l) * sp, (oy / l) * sp - 20, R.range(0.25, 0.55), C[2 + R.int(0, 1)] , 0.6);
  }
}
function sparkle(buf    , light    , x        , y        , arm        , c        , tip        ) {
  const px = Math.round(x), py = Math.round(y), n = Math.round(arm);
  if (n < 1) return;
  for (let d = 1; d <= n; d++) {
    const cc = d > n * 0.6 ? tip : c;
    buf.set(px + d, py, cc);
    buf.set(px - d, py, cc);
    buf.set(px, py + d, cc);
    buf.set(px, py - d, cc);
  }
  if (n >= 3) for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) buf.set(px + dx , py + dy , c);
  if (n >= 6) for (const [dx, dy] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) buf.set(px + dx , py + dy , tip);
  buf.set(px, py, WHITE);
  light.glow(x, y, 4 + n * 2, c, 0.6);
}
function rgb(r        , g        , b        , a = 255) { return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255); }
function hex(h        ) { const v = parseInt(h.replace("#", ""), 16); return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255); }
function scale(c        , k        ) {
  return rgb(Math.min(255, (c & 255) * k), Math.min(255, ((c >>> 8) & 255) * k), Math.min(255, ((c >>> 16) & 255) * k), c >>> 24);
}
const WHITE = hex("#ffffff");
const STEEL = ["#ffffff", "#e8f1ff", "#b8c9e8", "#62c8f4", "#3a8bd8", "#2c58aa", "#212f6b"].map(hex);
const HOT = ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"].map(hex);
const PX = 2;
class Px {
  w        ; h        ; ox        ; oy        ; data             ;
  constructor(f       , data             ) { this.w = f.w; this.h = f.h; this.ox = f.ox; this.oy = f.oy; this.data = data; }
  at(x        , y        ) { x = (x - this.ox) | 0; y = (y - this.oy) | 0; return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x; }
  set(x        , y        , c        ) { const i = this.at(x, y); if (i >= 0) this.data[i] = c; }
  add(x        , y        , c        , k        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , r = Math.min(255, (d & 255) + (c & 255) * k), g = Math.min(255, ((d >>> 8) & 255) + ((c >>> 8) & 255) * k), b = Math.min(255, ((d >>> 16) & 255) + ((c >>> 16) & 255) * k);
    this.data[i] = (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  line(x0        , y0        , x1        , y1        , c        ) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 4096; n++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) (err += dy), (x0 += sx);
      if (e2 <= dx) (err += dx), (y0 += sy);
    }
  }
  glow(cx        , cy        , r        , c        , k        ) {
    if (r < 1 || k <= 0.01) return;
    const x0 = Math.max(this.ox, Math.floor(cx - r)), x1 = Math.min(this.ox + this.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(this.oy, Math.floor(cy - r)), y1 = Math.min(this.oy + this.h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / r;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / r, d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const f = 1 - Math.sqrt(d);
        this.add(x, y, c, f * f * k);
      }
    }
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayer(x        , y        ) { return (BAYER[((y & 3) << 2) | (x & 3)]  + 0.5) / 16; }
function dot(buf    , x        , y        , c        , a = 1) {
  const px = Math.floor(x), py = Math.floor(y);
  if (a >= 1 || a > bayer(px, py)) buf.set(px, py, c);
}
class Rng {
          s        ;
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a        , b        ) { return a + (b - a) * this.next(); }
  int(a        , b        ) { return Math.floor(this.range(a, b + 1)); }
}
const TAU = Math.PI * 2;
function clamp(v        , a = 0, b = 1) { return v < a ? a : v > b ? b : v; }
function smooth(a        , b        , x        ) { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }
function outExpo(t        ) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)); }
function outBack(t        , s = 1.7) { const u = clamp(t) - 1; return 1 + (s + 1) * u * u * u + s * u * u; }
const GRAVITY = 1900;
const K = { SPARK: 0, MOTE: 1 }         ;
                                    
                                                                                                                        
class Particles {
  list      = [];
  ground                       ;
  sparks                   ;
  constructor(ground                       , sparks                   ) { this.ground = ground; this.sparks = sparks; }
  spawn(k   , x        , y        , vx        , vy        , life        , col = 0, size = 1) {
    this.list.push({ k, x, y, vx, vy, life, max: life, col, size });
  }
  update(dt        ) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i] ;
      if ((p.life -= dt) <= 0) { L.splice(i, 1); continue; }
      if (p.k === K.SPARK) {
        p.vy += GRAVITY * 0.45 * dt;
        p.vx -= p.vx * 2.2 * dt;
        p.vy -= p.vy * 2.2 * dt;
        const g = this.ground(p.x), ny = p.y + p.vy * dt;
        p.x += p.vx * dt;
        if (p.vy > 0 && p.y <= g && ny >= g) { p.vy = -p.vy * 0.45; p.vx *= 0.7; p.y = g - 0.5; } else p.y = ny;
      } else { p.vx -= p.vx * 0.6 * dt; p.vy -= p.vy * 0.6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    }
  }
  draw(buf    , light    ) {
    for (const p of this.list) {
      const k = p.life / p.max, ax = p.x / PX, ay = p.y / PX, px = Math.floor(ax), py = Math.floor(ay);
      const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp;
      if (p.k === K.SPARK) {
        const S = this.sparks, head = k > 0.6 ? S[0]  : k > 0.3 ? S[1]  : S[2] , len = Math.min(9, 1 + sp * 0.011);
        buf.line(ax - ux * len, ay - uy * len, ax - ux * len * 0.4, ay - uy * len * 0.4, k > 0.5 ? head : S[S.length - 1] );
        buf.line(ax - ux * len * 0.45, ay - uy * len * 0.45, ax, ay, head);
        light.glow(ax, ay, 3, head, 0.45 * k);
      } else {
        const len = Math.min(16, 0.5 + sp * 0.013) * p.size;
        if (k < 0.35 && bayer(px, py) > k / 0.35) continue;
        buf.line(ax - ux * len, ay - uy * len, ax - ux * len * 0.35, ay - uy * len * 0.35, scale(p.col, 0.55));
        buf.line(ax - ux * len * 0.4, ay - uy * len * 0.4, ax, ay, p.col);
        light.glow(ax, ay, 2.5 + p.size, p.col, 0.4 * k);
      }
    }
  }
}

window.SF_VFX.slash = slash;
})();
(() => {
// Made by Sprite Fusion, to have full context over VFX, connect to the MCP: https://www.spritefusion.com/mcp
// MIT License
// Copyright (c) 2026 Hugo Duprez
                                                                                                               
                                     
                                                                      
                          
                                            
                
             
             
                        
                                         
                                            
                
                  
                
                 
                  
                           
                 
                               
                                      
                                       
                                                                                                   
 
               
             
         
              
                
                  
                                  
                                                  
 
                                                                                                                                            
function energy(o          = {}) {
  const R = new Rng(o.seed ?? 1), C = typeof o.colors === "object" ? o.colors : RAMPS[o.colors ?? "cyan"];
  const groundAt = (x        ) => (o.ground === undefined ? Infinity : typeof o.ground === "number" ? o.ground : o.ground(x));
  const ps = new Particles(R, groundAt, C), lights          = [];
  const hand = () => o.actor?.hand() ?? { x: o.x ?? 430, y: o.y ?? 552, a: 0 };
  const c      = { o, R, C, ps, lights, groundAt, hand };
  const kind = o.kind ?? "charge";
  const run = kind === "beam" ? beam(c) : kind === "orb" ? orb(c) : kind === "bolt" ? projectile(c) : charge(c);
  return {
    update(dt        ) { run.update(dt); ps.update(dt); stepLights(lights, dt); },
    draw(f       , layer        ) {
      const buf = new Px(f, f.color), light = new Px(f, f.light);
      if (layer !== "front") { run.back?.(buf, light); ps.draw(buf, light, "back"); }
      if (layer !== "back") { run.front(buf, light); ps.draw(buf, light, "front"); drawLights(light, lights); }
    },
    stop: () => run.stop?.(),
    done: () => run.over() && ps.list.length === 0 && lights.length === 0,
  };
}
function charge({ o, R, C, ps, lights, hand }     )      {
  const REL = o.charge ?? 2.8, rumble = holder(o.shake);
  const sparks                           = [];
  let t = 0, released = false, phase = 0, pulses           = [], rel                   = [0, 0];
  const level = () => clamp(t / REL);
  return {
    update(dt) {
      t += dt;
      const k = level(), e = k * k, m = hand();
      if (t < REL) {
        for (let i = 0; i < 1 + Math.floor(e * 6); i++) {
          const a = R.range(0, TAU), d = R.range(60, 170) * (1 - 0.35 * k), life = R.range(0.16, 0.26), sp = (d / life) * 0.95;
          ps.spawn(K.MOTE, m.x + Math.cos(a) * d, m.y + Math.sin(a) * d, -Math.cos(a) * sp - Math.sin(a) * sp * 0.4, -Math.sin(a) * sp + Math.cos(a) * sp * 0.4, life, R.pick([C[0] , C[1] , C[2] ]), 1);
        }
        phase += (2 + 13 * e) * dt;
        if (phase >= 1) { phase -= 1; pulses.push(t); }
        if (k > 0.4 && R.chance(0.25 * k)) {
          const a = R.range(0, TAU), l = R.range(6, 12) * (0.5 + k), x0 = m.x / PX, y0 = m.y / PX;
          sparks.push({ b: bolt(R, x0, y0, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l, 0.4, 0.3, 0.7), t });
        }
        rumble(0.08 * e, dt);
      } else if (!released) {
        released = true;
        rel = [m.x, m.y];
        o.flash?.(0.8, rgbString(C[1] ));
        o.shake?.(0.35);
        o.ripple?.(m.x, m.y, 10, 300, 0.6, 0.18, 40);
        lights.push({ x: m.x, y: m.y, r: 240, color: C[2] , k: 1, life: 0.45, max: 0.45 });
        for (let i = 0; i < 70; i++) {
          const a = R.range(0, TAU), sp = R.range(200, 900);
          ps.spawn(R.chance(0.65) ? K.MOTE : K.STAR, m.x, m.y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.3, 0.8), R.pick([C[0] , C[1] , C[2] ]), R.range(0.8, 2));
        }
      }
      pulses = pulses.filter((p) => t - p < 0.2);
      for (let i = sparks.length - 1; i >= 0; i--) if (t - sparks[i] .t > 0.06) sparks.splice(i, 1);
    },
    front(buf, light) {
      const k = level();
      if (t < REL) {
        const m = hand(), jit = k > 0.8 ? (Math.floor(t * 40) % 2 ? 1 : -1) * ((k - 0.8) / 0.2) : 0, ox = m.x / PX + jit, oy = m.y / PX;
        const pr = Math.sin(phase * TAU) * 0.5 + 0.5, r = 1.2 + 5.5 * k * k + pr * (0.6 + 1.2 * k);
        orbBall(buf, ox, oy, r, t, k, C);
        for (const p of pulses) {
          const q = (t - p) / 0.2;
          buf.ring(ox, oy, r + 2 + 16 * (1 - outCubic(q)) * (0.5 + k), 1, q > 0.6 ? C[0]  : C[1] , 1 - q * 0.6);
        }
        for (const sp of sparks) drawBolt(buf, light, sp.b, { core: C[0] , body: C[1] , halo: C[3] , glow: C[2]  }, 1, 0.3);
        light.glow(ox, oy, 12 + 30 * k, C[2] , 0.5 + 0.6 * k);
        light.glow(ox, oy, 6 + 6 * k, C[0] , 0.5 + 0.4 * k);
      }
      if (t >= REL && t <= REL + 0.6) {
        const q = (t - REL) / 0.6, e = outCubic(q), ox = rel[0] / PX, oy = rel[1] / PX;
        if (q < 0.12) { buf.disc(ox, oy, 12 * (1 - q * 5) + 1.5, C[2] ); buf.disc(ox, oy, 12 * (1 - q * 5), C[0] ); }
        if (q < 0.3) cross(buf, ox, oy, (1 - q / 0.3) * 30 + 4, C);
        buf.ring(ox, oy, 4 + 80 * e, Math.max(1, 5 * (1 - q)), q < 0.2 ? C[0]  : C[1] , 1.2 - q);
        buf.ring(ox, oy, 2 + 44 * outCubic(q * 1.4), Math.max(1, 2 * (1 - q)), C[2] , 1 - q);
        light.glow(ox, oy, 130 * (0.4 + 0.6 * e), C[2] , 1.1 * (1 - q));
      }
    },
    over: () => t > REL + 1,
  };
}
function orbBall(buf    , x        , y        , r        , t        , k        , C          ) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 1.5, l = (2 + 6 * k) * (0.5 + 0.5 * Math.abs(noise(t * 14 + i * 3, i)));
    if (k > 0.2) seg(buf, x + Math.cos(a) * (r + 1), y + Math.sin(a) * (r + 1), x + Math.cos(a) * (r + 1 + l), y + Math.sin(a) * (r + 1 + l), i % 2 ? C[2]  : C[1] );
  }
  buf.disc(x, y, r + 1.2, C[4] );
  buf.disc(x, y, r, C[2] );
  buf.disc(x - r * 0.12, y - r * 0.12, r * 0.72, C[1] );
  buf.disc(x, y, r * 0.42, C[0] );
  if (r > 3)
    for (const s of [0, Math.PI])
      for (let a = 0; a < 1.2; a += 0.12) {
        const ang = t * 9 + s + a, rr = r * (0.58 + 0.12 * Math.sin(a * 3));
        dot(buf, x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, a < 0.5 ? C[0]  : C[1] );
      }
}
function cross(buf    , x        , y        , l        , C          ) {
  for (let d = -l; d <= l; d++) {
    const a = Math.abs(d) / l, c = a < 0.3 ? C[0]  : a < 0.65 ? C[1]  : C[2] ;
    dot(buf, x + d, y, c, 1.15 - a);
    dot(buf, x, y + d * 0.7, c, 1.15 - a);
  }
}
function beam({ o, R, C, ps, lights, groundAt, hand }     )      {
  const [IX, IY] = o.to ?? [920, 596], FIRE = o.charge ?? 0.55, TAPER = FIRE + (o.hold ?? 1.95), OFF = TAPER + 0.4, W = o.width ?? 6.5;
  const GY = groundAt(IX), molten = Number.isFinite(GY) && Math.abs(GY - IY) < 30, SMOKE_TINTED = mix(SMOKE_TINT, C[3] , 0.45);
  let t = 0, fired = false, heat = 0;
  const width = (t        ) => (t < FIRE ? 0 : t < TAPER ? W * (1 + 0.35 * Math.exp(-(t - FIRE) * 10)) : lerp(W, 0.4, outCubic((t - TAPER) / (OFF - TAPER))));
  const on = (t        ) => t >= FIRE && t < OFF;
  return {
    update(dt) {
      t += dt;
      const m = hand();
      if (t < FIRE) gather(ps, lights, R, C, m.x, m.y, clamp(t / FIRE));
      if (t >= FIRE && !fired) { fired = true; o.flash?.(0.45, rgbString(C[1] )); o.shake?.(0.15); o.kick?.(-3 * Math.sign(IX - m.x || 1), 0); }
      if (on(t)) {
        heat = Math.min(1, heat + dt * 1.2);
        const k = width(t) / W;
        for (let i = 0; i < 4 * k; i++) {
          const a = -Math.PI / 2 + R.range(-1.3, 0.9) - 0.4, sp = R.range(150, 560);
          ps.spawn(K.PLASMA, IX + R.range(-6, 6), IY - 2, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.5));
        }
        if (R.chance(0.2)) ps.spawn(K.SMOKE, IX + R.range(-10, 10), IY - 6, R.range(-10, 10), R.range(-50, -20), R.range(1, 1.8), SMOKE_TINTED, R.range(3, 5));
        if (R.chance(0.5 * k)) {
          const u = R.next();
          ps.spawn(K.PLASMA, lerp(m.x, IX, u), lerp(m.y, IY, u), R.range(-60, 60), R.range(-90, 30), R.range(0.1, 0.25));
        }
      } else heat = Math.max(0, heat - dt * 0.6);
    },
    back(buf, light) {
      if (molten && heat > 0.02) {
        const cx = IX / PX, cy = Math.round(GY / PX);
        for (let y = cy; y <= cy + 3; y++)
          for (let x = Math.floor(cx - 18); x <= cx + 18; x++) {
            const d = Math.abs(x + 0.5 - cx) / 18 + (y - cy) * 0.22, T = heat * (1.15 - d) - hash(x * 13 + y) * 0.3;
            if (T > 0.05) buf.set(x, y, HEAT_RAMP[Math.min(HEAT_RAMP.length - 1, Math.floor((1 - Math.min(1, T)) * (HEAT_RAMP.length - 1)))] );
          }
        light.glow(cx, cy, 30, HEAT_RAMP[4] , 0.4 * heat);
      }
    },
    front(buf, light) {
      const m = hand(), ax = m.x / PX, ay = m.y / PX, bx = IX / PX, by = IY / PX;
      if (t < FIRE) {
        const k = t / FIRE, r = 1 + 3.5 * k * k;
        buf.disc(ax, ay, r + 1, C[3] );
        buf.disc(ax, ay, r, C[2] );
        buf.disc(ax, ay, r * 0.5, C[0] );
        return;
      }
      if (!on(t)) return;
      const L0 = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / L0, dy = (by - ay) / L0, nx = -dy, ny = dx;
      const L = L0 * outExpo((t - FIRE) / 0.07), w0 = width(t), k = w0 / W;
      for (let d = 0; d <= L; d += 0.5) {
        const w = w0 * (1 + 0.12 * Math.sin(d * 0.35 - t * 42)) * Math.min(1, (d + 3) / 7), x = ax + dx * d, y = ay + dy * d;
        const pulse = frac(d * 0.025 - t * 3.4) < 0.07 ? 1 : 0;
        for (let q0 = -w * 1.3; q0 <= w * 1.3; q0 += 0.5) {
          const q = Math.abs(q0) / Math.max(0.3, w), px = Math.floor(x + nx * q0), py = Math.floor(y + ny * q0);
          const lvl = Math.max(0, (q < 0.2 ? 0 : q < 0.4 ? 1 : q < 0.62 ? 2 : q < 0.85 ? 3 : q < 1 ? 4 : 5) - pulse);
          if (lvl === 5 && bayer(px, py) > (1.3 - q) / 0.3) continue;
          buf.set(px, py, C[lvl] );
        }
        for (const s of [0, Math.PI]) {
          const ph = d * 0.2 - t * 28 + s, q0 = Math.sin(ph) * w * 0.85;
          if (Math.cos(ph) > -0.2) dot(buf, x + nx * q0, y + ny * q0, Math.cos(ph) > 0.5 ? C[0]  : C[1] );
        }
        if ((Math.round(d * 2) & 11) === 0) light.glow(x, y, w * 2.2 + 4, C[3] , 0.3 * k);
      }
      const fr = 3 + 2 * k + Math.sin(t * 50) * 0.6;
      buf.disc(ax, ay, fr + 1.5, C[3] );
      buf.disc(ax, ay, fr, C[2] );
      buf.disc(ax, ay, fr * 0.6, C[0] );
      for (let i = 0; i < 4; i++) {
        const a = t * 9 + (i * TAU) / 4, l = (6 + 3 * Math.sin(t * 30 + i)) * k;
        seg(buf, ax, ay, ax + Math.cos(a) * l, ay + Math.sin(a) * l, i % 2 ? C[2]  : C[0] );
      }
      light.glow(ax, ay, 26 * k + 8, C[2] , 0.9 * k);
      if (L >= L0 - 0.5) {
        const ir = 4 + 2.5 * k + Math.sin(t * 60) * 0.8;
        buf.disc(bx, by, ir + 1.5, C[3] );
        buf.disc(bx, by, ir, C[1] );
        buf.disc(bx, by, ir * 0.55, C[0] );
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i - 3) * 0.32 - 0.5, l = (8 + 7 * Math.abs(noise(t * 18 + i * 3, i))) * k;
          seg(buf, bx, by - 1, bx + Math.cos(a) * l, by + Math.sin(a) * l, i % 2 ? C[2]  : C[1] );
        }
        light.glow(bx, by, 50 * k + 10, C[2] , 1 * k);
        light.glow(bx, by, 14, C[0] , 0.7 * k);
      }
    },
    over: () => t > OFF && heat <= 0,
  };
}
function gather(ps           , lights         , R     , C          , x        , y        , k        ) {
  for (let i = 0; i < 2 + Math.floor(k * 4); i++) {
    const a = R.range(0, TAU), d = R.range(34, 96) * (1 - k * 0.45), sp = d * R.range(6, 9);
    ps.spawn(K.PLASMA, x + Math.cos(a) * d, y + Math.sin(a) * d, -Math.cos(a) * sp - Math.sin(a) * sp * 0.45, -Math.sin(a) * sp + Math.cos(a) * sp * 0.45, R.range(0.1, 0.14));
  }
  if (R.chance(0.3 + k * 0.4)) ps.spawn(K.GLINT, x + R.range(-3, 3), y + R.range(-3, 3), 0, 0, 0.03, C[2] , 1 + k);
  lights.push({ x, y, r: 30 + 70 * k, color: C[3] , k: 0.5 + 0.7 * k, life: 0.05, max: 0.05 });
  lights.push({ x, y, r: 14 + 18 * k, color: C[0] , k: 0.3 * k, life: 0.04, max: 0.04 });
}
function orb({ o, R, C, ps, lights, groundAt }     )      {
  const X = o.x ?? 760, Y0 = o.y ?? 484, RAD = o.radius ?? 20, [E0, E1] = o.every ?? [1.1, 1.5];
  const COLS = { core: C[0] , body: C[2] , halo: C[4] , glow: C[3]  };
  const fils = Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * TAU, w: (0.5 + hash(i, 1) * 0.9) * (i % 2 ? 1 : -1), b: null               , end: [0, 0]                     }));
  const motes = Array.from({ length: 8 }, (_, i) => ({ a: hash(i, 4) * TAU, w: 1.6 + hash(i, 5) * 1.4, r: RAD + 4 + hash(i, 6) * 7, tilt: (hash(i, 7) - 0.5) * 1.4 }));
  let t = 0, zap                                = null, struck = -1, nextZap = 1.75, stopAt = Infinity;
  const centre = ()                   => [X / PX, Y0 / PX + Math.sin(t * 1.7) * 3];
  const size = () => (t < stopAt ? smooth(0, 0.3, t) : 1 - smooth(stopAt, stopAt + 0.4, t));
  const motePos = (m                        , cx        , cy        , s        ) => {
    const a = m.a + m.w * t, x = Math.cos(a) * m.r * s, z = Math.sin(a);
    return { x: cx + x * Math.cos(m.tilt), y: cy + x * Math.sin(m.tilt) + z * m.r * s * 0.28, z };
  };
  return {
    update(dt) {
      t += dt;
      const [cx, cy] = centre(), s = size(), rad = RAD * s, f = Math.floor(t * 30);
      if (f !== struck && f % 2 === 0 && s > 0.05) {
        struck = f;
        for (const [i, fl] of fils.entries()) {
          fl.a += fl.w * 0.07 + noise(t * 2 + i, i) * 0.12;
          fl.end = [cx + Math.cos(fl.a) * (rad - 0.8), cy + Math.sin(fl.a) * (rad - 0.8)];
          fl.b = bolt(R, cx, cy, fl.end[0], fl.end[1], 0.2, 0.5, 0.35);
        }
      }
      const G = groundAt(X);
      if (t >= nextZap && t < stopAt && Number.isFinite(G)) {
        nextZap = t + R.range(E0, E1);
        const x1 = cx + R.range(-30, 30);
        zap = { b: bolt(R, cx, cy + rad, x1, G / PX, 0.3, 0.5), t };
        for (let i = 0; i < 16; i++) ps.spawn(K.STAR, x1 * PX, G - 2, R.range(-180, 180), -R.range(60, 260), R.range(0.25, 0.6), R.pick([C[0] , C[1] , C[2] ]), R.range(0.6, 1.4));
        lights.push({ x: x1 * PX, y: G - 6, r: 90, color: C[3] , k: 0.7, life: 0.15, max: 0.15 });
      }
      if (zap && t - zap.t > 0.12) zap = null;
      if (t < stopAt && R.chance(0.15)) {
        const a = R.range(0, TAU);
        ps.spawn(K.MOTE, (cx + Math.cos(a) * (rad + 1)) * PX, (cy + Math.sin(a) * (rad + 1)) * PX, Math.cos(a) * 40, Math.sin(a) * 40 - 20, R.range(0.4, 0.8), C[2] , 0.8);
      }
    },
    back(buf, light) {
      const [cx, cy] = centre(), s = size();
      if (s <= 0.02) return;
      for (const m of motes) {
        const p = motePos(m, cx, cy, s);
        if (p.z >= 0) continue;
        dot(buf, p.x, p.y, C[4] );
        dot(buf, p.x - Math.sign(m.w), p.y, C[5] , 0.6);
      }
      const pl = 0.8 + 0.2 * Math.sin(t * 7) + 0.1 * noise(t * 20, 2);
      light.glow(cx, cy, 52 * pl * s, C[3] , 0.5 * pl * s);
    },
    front(buf, light) {
      const [cx, cy] = centre(), s = size(), rad = RAD * s, pulse = 0.8 + 0.2 * Math.sin(t * 7);
      if (s > 0.02) {
        for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++)
          for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
            const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / rad;
            if (d > 1) continue;
            if (0.15 + 0.55 * d * d > bayer(x, y)) buf.set(x, y, d > 0.8 ? C[6]  : C[7] );
          }
        for (const fl of fils) {
          if (!fl.b) continue;
          for (const p of fl.b.paths)
            for (let i = 0; i < p.pts.length - 1; i++) {
              const [x0, y0] = p.pts[i] , [x1, y1] = p.pts[i + 1] , u = Math.hypot(x0 - cx, y0 - cy) / rad;
              seg(buf, x0 + 1, y0, x1 + 1, y1, C[4] , 0.5);
              seg(buf, x0, y0, x1, y1, p.w > 0.3 && u < 0.4 ? C[0]  : p.w > 0.3 ? C[1]  : C[2] );
              if (i % 3 === 0) light.glow(x0, y0, 5, C[3] , 0.2);
            }
          const [ex, ey] = fl.end;
          buf.disc(ex, ey, 1.6, C[1] );
          buf.set(Math.floor(ex), Math.floor(ey), C[0] );
          light.glow(ex, ey, 6, C[2] , 0.5);
        }
        const cr = (2.4 + 1.2 * pulse) * s;
        buf.disc(cx, cy, cr + 1.4, C[3] );
        buf.disc(cx, cy, cr, C[1] );
        buf.disc(cx, cy, cr * 0.55, C[0] );
        light.glow(cx, cy, 16, C[0] , 0.55 * pulse * s);
        buf.ring(cx, cy, rad + 0.3, 1, C[3] );
        buf.ring(cx, cy, rad + 1.2, 1, C[6] );
        for (let a = 3.5; a < 4.6; a += 0.04) dot(buf, cx + Math.cos(a) * (rad - 2.2), cy + Math.sin(a) * (rad - 2.2), a > 3.8 && a < 4.3 ? C[0]  : C[1] );
        buf.disc(cx - rad * 0.42, cy - rad * 0.5, 1, C[0] );
        dot(buf, cx + rad * 0.5, cy + rad * 0.55, C[2] );
        for (const m of motes) {
          const p = motePos(m, cx, cy, s);
          if (p.z < 0) continue;
          dot(buf, p.x, p.y, C[0] );
          dot(buf, p.x - Math.sign(m.w), p.y, C[2] );
          dot(buf, p.x - 2 * Math.sign(m.w), p.y, C[4] , 0.6);
          light.glow(p.x, p.y, 5, C[2] , 0.35);
        }
      }
      if (zap) drawBolt(buf, light, zap.b, COLS, 1 - (t - zap.t) / 0.15, 0.6);
    },
    over: () => t > stopAt + 0.4 && !zap,
    stop() { stopAt = Math.min(stopAt, t); },
  };
}
function projectile({ o, R, C, ps, lights, groundAt, hand }     )      {
  const CH = o.charge ?? 0.28, SPEED = o.speed ?? 1100;
  const trail                     = [];
  let t = 0, from                          = null, to                   = [0, 0], T = 1, hit = -1;
  const head = ()                   => { if (!from) return [0, 0]; const u = clamp((t - CH) / T); return [lerp(from[0], to[0], u), lerp(from[1], to[1], u)]; };
  return {
    update(dt) {
      t += dt;
      const m = hand();
      if (t < CH) {
        if (R.chance(0.7)) {
          const a = R.range(0, TAU), d = R.range(20, 50), sp = d / 0.12;
          ps.spawn(K.MOTE, m.x + Math.cos(a) * d, m.y + Math.sin(a) * d, -Math.cos(a) * sp, -Math.sin(a) * sp, 0.12, R.pick([C[0] , C[1] , C[2] ]), 0.8);
        }
        return;
      }
      if (!from) {
        from = [m.x, m.y];
        to = o.to ?? [m.x + Math.cos(m.a) * 420, m.y + Math.sin(m.a) * 420];
        T = Math.max(0.05, Math.hypot(to[0] - from[0], to[1] - from[1]) / SPEED);
        o.kick?.(-2 * Math.sign(to[0] - from[0] || 1), 0);
        lights.push({ x: from[0], y: from[1], r: 70, color: C[2] , k: 0.8, life: 0.1, max: 0.1 });
      }
      if (hit < 0) {
        const [x, y] = head();
        trail.push([x, y]);
        if (trail.length > 7) trail.shift();
        if (R.chance(0.7)) ps.spawn(K.MOTE, x, y, R.range(-60, 60), R.range(-60, 60), R.range(0.15, 0.3), R.pick([C[1] , C[2] ]), 0.7);
        if (t - CH >= T) {
          hit = t;
          trail.length = 0;
          o.shake?.(0.12);
          o.flash?.(0.15, rgbString(C[1] ));
          const onGround = Math.abs(groundAt(x) - y) < 8;
          for (let i = 0; i < 26; i++) {
            const a = (onGround ? -Math.PI / 2 + R.range(-1.4, 1.4) : R.range(0, TAU)), sp = R.range(200, 700);
            ps.spawn(K.PLASMA, x, y - 1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.45));
          }
          for (let i = 0; i < 14; i++) {
            const a = R.range(0, TAU), sp = R.range(80, 300);
            ps.spawn(i % 2 ? K.STAR : K.MOTE, x, y, Math.cos(a) * sp, Math.sin(a) * sp - (onGround ? 120 : 0), R.range(0.25, 0.6), R.pick([C[0] , C[1] , C[2] ]), R.range(0.8, 1.6));
          }
          lights.push({ x, y, r: 150, color: C[3] , k: 0.9, life: 0.25, max: 0.25 });
        }
      }
    },
    front(buf, light) {
      if (t < CH) {
        const m = hand(), k = t / CH, r = 0.8 + 2.6 * k;
        buf.disc(m.x / PX, m.y / PX, r + 1, C[3] );
        buf.disc(m.x / PX, m.y / PX, r, C[1] );
        buf.disc(m.x / PX, m.y / PX, r * 0.5, C[0] );
        light.glow(m.x / PX, m.y / PX, 10 + 14 * k, C[2] , 0.6 * k);
        return;
      }
      if (hit < 0 && from) {
        const [hx, hy] = head(), ax = hx / PX, ay = hy / PX;
        for (let i = 0; i < trail.length - 1; i++) {
          const [x0, y0] = trail[i] , [x1, y1] = trail[i + 1] , u = (i + 1) / trail.length;
          for (let d = 0; d <= 1; d += 0.1) {
            const x = lerp(x0, x1, d) / PX, y = lerp(y0, y1, d) / PX, w = 0.6 + 2.6 * (u - 0.1 + d * 0.1);
            if (w > 1.6) buf.disc(x, y, w, C[3] );
            buf.disc(x, y, Math.max(0.6, w * 0.55), u > 0.6 ? C[1]  : C[2] );
          }
          light.glow(x0 / PX, y0 / PX, 8 * u + 2, C[3] , 0.3 * u);
        }
        for (let i = 0; i < 4; i++) {
          const a = t * 22 + (i * TAU) / 4, l = 5 + 1.5 * Math.sin(t * 50 + i);
          seg(buf, ax + Math.cos(a) * 3, ay + Math.sin(a) * 3, ax + Math.cos(a) * l, ay + Math.sin(a) * l, C[1] );
        }
        buf.disc(ax, ay, 4.2, C[4] );
        buf.disc(ax, ay, 3.3, C[2] );
        buf.disc(ax, ay, 2.3, C[1] );
        buf.disc(ax, ay, 1.3, C[0] );
        light.glow(ax, ay, 26, C[3] , 0.7);
        light.glow(ax, ay, 9, C[0] , 0.5);
      }
      if (hit >= 0 && t - hit < 0.35) {
        const q = (t - hit) / 0.35, [x, y] = to, ax = x / PX, ay = y / PX;
        if (q < 0.15) { buf.disc(ax, ay, 9 * (1 - q * 3) + 1.5, C[3] ); buf.disc(ax, ay, 9 * (1 - q * 3), C[0] ); }
        if (q < 0.4) cross(buf, ax, ay, 18 * (1 - q / 0.4) + 3, C);
        buf.ring(ax, ay, 3 + 22 * outCubic(q), Math.max(1, 3 * (1 - q)), q < 0.3 ? C[0]  : C[2] , 1.2 - q);
      }
    },
    over: () => hit >= 0 && t - hit > 0.4,
  };
}
function holder(shake                           ) {
  let held = 0;
  return (level        , dt        ) => { held = Math.max(0, held - 1.7 * dt); if (level > held) { shake?.(level - held); held = level; } };
}
const PX = 2;
class Px {
  w        ; h        ; ox        ; oy        ; data             ;
  constructor(f       , data             ) { this.w = f.w; this.h = f.h; this.ox = f.ox; this.oy = f.oy; this.data = data; }
  at(x        , y        ) { x = (x - this.ox) | 0; y = (y - this.oy) | 0; return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x; }
  set(x        , y        , c        ) { const i = this.at(x, y); if (i >= 0) this.data[i] = c; }
  blend(x        , y        , c        , a        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , oa = a + ((d >>> 24) / 255) * (1 - a);
    if (oa <= 0) return;
    const k = a / oa, j = 1 - k, r = (c & 255) * k + (d & 255) * j, g = ((c >>> 8) & 255) * k + ((d >>> 8) & 255) * j, b = ((c >>> 16) & 255) * k + ((d >>> 16) & 255) * j;
    this.data[i] = ((oa * 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  add(x        , y        , c        , k        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , r = Math.min(255, (d & 255) + (c & 255) * k), g = Math.min(255, ((d >>> 8) & 255) + ((c >>> 8) & 255) * k), b = Math.min(255, ((d >>> 16) & 255) + ((c >>> 16) & 255) * k);
    this.data[i] = (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  disc(cx        , cy        , r        , c        ) {
    if (r <= 0.5) return this.set(Math.round(cx), Math.round(cy), c);
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx; if (dx * dx + dy * dy <= r2) this.set(x, y, c); }
    }
  }
  alphaDisc(cx        , cy        , r        , c        , a        ) {
    if (a <= 0.01) return;
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx; if (dx * dx + dy * dy <= r2) this.blend(x, y, c, a); }
    }
  }
  ring(cx        , cy        , r        , thick        , c        , alpha = 1) {
    const ro = r + thick * 0.5, ri = Math.max(0, r - thick * 0.5), ro2 = ro * ro, ri2 = ri * ri;
    for (let y = Math.floor(cy - ro); y <= Math.ceil(cy + ro); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - ro); x <= Math.ceil(cx + ro); x++) {
        const dx = x + 0.5 - cx, d2 = dx * dx + dy * dy;
        if (d2 <= ro2 && d2 >= ri2 && (alpha >= 1 || alpha > bayer(x, y))) this.set(x, y, c);
      }
    }
  }
  line(x0        , y0        , x1        , y1        , c        ) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 4096; n++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) (err += dy), (x0 += sx);
      if (e2 <= dx) (err += dx), (y0 += sy);
    }
  }
  glow(cx        , cy        , r        , c        , k        ) {
    if (r < 1 || k <= 0.01) return;
    const x0 = Math.max(this.ox, Math.floor(cx - r)), x1 = Math.min(this.ox + this.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(this.oy, Math.floor(cy - r)), y1 = Math.min(this.oy + this.h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / r;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / r, d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const f = 1 - Math.sqrt(d);
        this.add(x, y, c, f * f * k);
      }
    }
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayer(x        , y        ) { return (BAYER[((y & 3) << 2) | (x & 3)]  + 0.5) / 16; }
function dot(buf    , x        , y        , c        , a = 1) {
  const px = Math.floor(x), py = Math.floor(y);
  if (a >= 1 || a > bayer(px, py)) buf.set(px, py, c);
}
function seg(buf    , x0        , y0        , x1        , y1        , c        , a = 1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) dot(buf, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a);
}
function rgb(r        , g        , b        , a = 255) { return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255); }
function hex(h        ) { const v = parseInt(h.replace("#", ""), 16); return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255); }
function mix(c1        , c2        , t        ) {
  const u = 1 - t, ch = (c        , s        ) => (c >>> s) & 255;
  return rgb(ch(c1, 0) * u + ch(c2, 0) * t, ch(c1, 8) * u + ch(c2, 8) * t, ch(c1, 16) * u + ch(c2, 16) * t, ch(c1, 24) * u + ch(c2, 24) * t);
}
function scale(c        , k        ) {
  return rgb(Math.min(255, (c & 255) * k), Math.min(255, ((c >>> 8) & 255) * k), Math.min(255, ((c >>> 16) & 255) * k), c >>> 24);
}
function ramp(stops                   , t        ) {
  const u = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1), i = Math.floor(u);
  return mix(stops[i] , stops[i + 1] , u - i);
}
function rgbString(c        ) {
  return `${c & 255},${(c >>> 8) & 255},${(c >>> 16) & 255}`;
}
const RAMPS = {
  cyan: ["#ffffff", "#d6ffff", "#7ff3ff", "#1ab8e6", "#2b6fd2", "#25449c", "#1b2662", "#0f1538"].map(hex),
  gold: ["#fffbe8", "#ffec92", "#ffd243", "#f4a923", "#c9761b", "#8c4716", "#512611", "#2c140b"].map(hex),
  pink: ["#ffffff", "#ffd8f5", "#ff9ee4", "#ff5fd0", "#d43cc4", "#8a2bb0", "#4b1a7a", "#250d42"].map(hex),
};
const HEAT_RAMP = ["#ffffff", "#fff3a6", "#ffe26b", "#ffc23d", "#ff8a2a", "#f2561d", "#c9281f", "#8a1f17", "#4f1a13", "#2a120e"].map(hex);
const SMOKE_RAMP = ["#7b6f72", "#5d5660", "#433d48", "#2b2630", "#1a171e"].map(hex);
const SMOKE_TINT = hex("#5b5566");
class Rng {
          s        ;
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a        , b        ) { return a + (b - a) * this.next(); }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  chance(p        ) { return this.next() < p; }
  pick   (a              )    { return a[Math.floor(this.next() * a.length)] ; }
}
const TAU = Math.PI * 2;
function clamp(v        , a = 0, b = 1) { return v < a ? a : v > b ? b : v; }
function lerp(a        , b        , t        ) { return a + (b - a) * t; }
function smooth(a        , b        , x        ) { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }
function outCubic(t        ) { return 1 - Math.pow(1 - clamp(t), 3); }
function outExpo(t        ) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)); }
function frac(x        ) { return x - Math.floor(x); }
function hash(n        , k = 0) { return ((Math.imul(n + 1 + k * 7919, 2654435761) >>> 0) % 100000) / 100000; }
function noise(x        , seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u);
}
const K = { MOTE: 0, STAR: 1, PLASMA: 2, SMOKE: 3, GLINT: 4 }         ;
                                    
                                                                                                                                      
class Particles {
  list      = [];
  t = 0;
  R     ;
  ground                       ;
  C          ;
  constructor(R     , ground                       , C          ) { this.R = R; this.ground = ground; this.C = C; }
  spawn(k   , x        , y        , vx        , vy        , life        , col = 0, size = 1) {
    this.list.push({ k, x, y, vx, vy, life, max: life, col, size, seed: this.R.next() * 100 });
  }
  update(dt        ) {
    this.t += dt;
    const t = this.t, L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i] ;
      if ((p.life -= dt) <= 0) { L.splice(i, 1); continue; }
      switch (p.k) {
        case K.MOTE:
          p.vx -= p.vx * 0.6 * dt;
          p.vy -= p.vy * 0.6 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case K.STAR:
          p.vx -= p.vx * 1.6 * dt;
          p.vy -= p.vy * 1.6 * dt + 10 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case K.PLASMA: {
          p.vy += 1900 * 0.45 * dt;
          p.vx -= p.vx * 2.2 * dt;
          p.vy -= p.vy * 2.2 * dt;
          const g = this.ground(p.x), ny = p.y + p.vy * dt;
          p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= g && ny >= g) { p.vy = -p.vy * 0.45; p.vx *= 0.7; p.y = g - 0.5; } else p.y = ny;
          break;
        }
        case K.SMOKE:
          p.vy -= 32 * dt;
          p.vx += Math.sin(t * 1.3 + p.seed) * 16 * dt;
          p.vx -= p.vx * 1.6 * dt;
          p.vy -= p.vy * 1.2 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case K.GLINT:
          break;
      }
    }
  }
  draw(buf    , light    , layer       ) { for (const p of this.list) if ((p.k === K.SMOKE) === (layer === "back")) this.drawOne(p, buf, light); }
          drawOne(p   , buf    , light    ) {
    const k = p.life / p.max, ax = p.x / PX, ay = p.y / PX, px = Math.floor(ax), py = Math.floor(ay), C = this.C;
    switch (p.k) {
      case K.MOTE: {
        const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, len = Math.min(16, 0.5 + sp * 0.013) * p.size;
        if (k < 0.35 && bayer(px, py) > k / 0.35) break;
        buf.line(ax - ux * len, ay - uy * len, ax - ux * len * 0.35, ay - uy * len * 0.35, scale(p.col, 0.55));
        buf.line(ax - ux * len * 0.4, ay - uy * len * 0.4, ax, ay, p.col);
        light.glow(ax, ay, 2.5 + p.size, p.col, 0.4 * k);
        break;
      }
      case K.STAR: {
        const tw = 0.6 + 0.4 * Math.sin(this.t * (8 + (p.seed % 5)) + p.seed);
        if (p.size < 1) { if (tw * k > 0.25) buf.set(px, py, tw > 0.8 ? C[0]  : p.col); light.glow(ax, ay, 3, p.col, 0.4 * k * tw); break; }
        const arm = Math.max(1, Math.round(p.size * tw * Math.min(1, k * 3))), tip = scale(p.col, 0.75);
        for (let d = 1; d <= arm; d++) {
          const cc = d === arm && arm > 1 ? tip : p.col;
          buf.set(px + d, py, cc);
          buf.set(px - d, py, cc);
          buf.set(px, py + d, cc);
          buf.set(px, py - d, cc);
        }
        buf.set(px, py, C[0] );
        light.glow(ax, ay, 3 + arm * 2, p.col, 0.5 * k * tw);
        break;
      }
      case K.PLASMA: {
        const hot = k > 0.5 ? C[0]  : k > 0.25 ? C[2]  : C[3] ;
        const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, len = Math.min(9, 1 + sp * 0.011);
        buf.line(ax - ux * len, ay - uy * len, ax - ux * len * 0.4, ay - uy * len * 0.4, k > 0.5 ? hot : C[3] );
        buf.line(ax - ux * len * 0.45, ay - uy * len * 0.45, ax, ay, hot);
        light.glow(ax, ay, 3, hot, 0.45 * k);
        break;
      }
      case K.SMOKE: {
        const age = 1 - k, r = p.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * 0.4);
        const a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * 0.58;
        const c = p.col ? mix(p.col, ramp(SMOKE_RAMP, age), age) : ramp(SMOKE_RAMP, age * 1.05);
        buf.alphaDisc(ax, ay, r, c, a * 0.45);
        buf.alphaDisc(ax + r * 0.05, ay + r * 0.06, r * 0.74, c, a * 0.62);
        break;
      }
      case K.GLINT: {
        const r = p.size * (0.5 + k * 0.5);
        buf.disc(ax, ay, r + 0.8, C[3] );
        buf.disc(ax, ay, r, p.col);
        light.glow(ax, ay, p.size * 4, p.col, 0.6 * k);
        break;
      }
    }
  }
}
                                                                                                        
function stepLights(lights         , dt        ) { for (let i = lights.length - 1; i >= 0; i--) if ((lights[i] .life -= dt) <= 0) lights.splice(i, 1); }
function drawLights(light    , lights         ) {
  for (const l of lights) { const k = l.life / l.max; light.glow(l.x / PX, l.y / PX, (l.r / PX) * (0.55 + 0.45 * k), l.color, l.k * k * k); }
}
                                                                  
function bolt(R     , x0        , y0        , x1        , y1        , jag = 0.32, forks = 0.35, w = 1, depth = 0)       {
  const out       = { paths: [] }, L = Math.hypot(x1 - x0, y1 - y0);
  let pts                     = [[x0, y0], [x1, y1]], off = L * jag;
  while (pts.length < 2 + L / 3) {
    const nxt                     = [pts[0] ];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i] , [bx, by] = pts[i + 1] , l = Math.hypot(bx - ax, by - ay) || 1, o = R.range(-off, off);
      nxt.push([(ax + bx) / 2 + (-(by - ay) / l) * o, (ay + by) / 2 + ((bx - ax) / l) * o], [bx, by]);
    }
    pts = nxt;
    off *= 0.52;
  }
  out.paths.push({ pts, w });
  if (depth < 2)
    for (let i = 2; i < pts.length - 3; i++)
      if (R.chance(forks / (1 + depth) / Math.max(4, pts.length / 6))) {
        const [ax, ay] = pts[i] , [bx, by] = pts[Math.min(pts.length - 1, i + 3)] ;
        const a = Math.atan2(by - ay, bx - ax) + R.sign() * R.range(0.35, 0.9), l = (L - (i / pts.length) * L) * R.range(0.25, 0.55);
        out.paths.push(...bolt(R, ax, ay, ax + Math.cos(a) * l, ay + Math.sin(a) * l, jag * 1.1, forks, w * 0.55, depth + 1).paths);
      }
  return out;
}
function drawBolt(buf    , light    , b      , cols                                                            , k = 1, glowK = 0.5) {
  for (const p of b.paths) {
    const thick = p.w >= 1;
    for (let i = 0; i < p.pts.length - 1; i++) {
      const [ax, ay] = p.pts[i] , [bx, by] = p.pts[i + 1] , l = Math.max(1, Math.hypot(bx - ax, by - ay));
      for (let d = 0; d <= l; d += 0.5) {
        const x = ax + ((bx - ax) * d) / l, y = ay + ((by - ay) * d) / l;
        if (k > 0.45 && thick) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) dot(buf, x + dx  * 1.5, y + dy  * 1.5, cols.halo, (k - 0.45) * 1.6);
        if (k > 0.25 && (thick || p.w > 0.4)) for (const [dx, dy] of [[1, 0], [0, 1]]) dot(buf, x + dx , y + dy , cols.body);
        buf.set(Math.floor(x), Math.floor(y), thick && k > 0.3 ? cols.core : cols.body);
      }
      if (i % 3 === 0) light.glow(ax, ay, (thick ? 9 : 5) * (0.5 + k * 0.5), cols.glow, glowK * k * p.w);
    }
  }
}

window.SF_VFX.energy = energy;
})();
(() => {
// Made by Sprite Fusion, to have full context over VFX, connect to the MCP: https://www.spritefusion.com/mcp
// MIT License
// Copyright (c) 2026 Hugo Duprez
                                                                                                               
                                     
                                                                                                                                             
                          
                
                                         
                
                           
                
                    
                
 
                                               
function fire(o          = {}) {
  const RAMP = o.ramp ?? FIRE, R = new Rng(o.seed ?? 1), S = o.size ?? 1, sS = Math.sqrt(S), WIND = o.wind ?? 0;
  const HEAT = [...RAMP.slice(0, 8), mix(RAMP[8] , SOOT, 0.35), mix(RAMP[8] , SOOT, 0.65)];
  const GLOW = o.ramp ? mix(RAMP[3] , RAMP[4] , 0.5) : WARM, SMOKE = mix(SMOKE1, RAMP[6] , 0.25), SEED = 37, GL = 0.9;
  const ps = new Particles(R, RAMP);
  const bx           = [], by           = [], top           = [], licks         = [];
  let tongues           = [], t = 0, stopAt = o.duration ?? 2.6, lv = 0, ax = 0, ay = 0, x = 0, y = 0, vx = 0, vy = 0, lean = 0, stretch = 0, placed = false;
  const lit = () => smooth(0, 0.3, t) * clamp(1 - (t - stopAt) / 1.2);
  function read() {
    bx.length = by.length = 0;
    const s = o.actor?.silhouette?.();
    if (s) {
      for (let py = 0; py < s.h; py++) for (let px = 0; px < s.w; px++) if (s.data[py * s.w + px]  >>> 24 > 127) bx.push(s.x + px), by.push(s.y + py);
      [ax, ay] = o.actor?.feet?.() ?? [(s.x + s.w / 2) * PX, (s.y + s.h) * PX];
    } else {
      const [X, Y, W, H] = o.box ?? [744, 568, 32, 32];
      for (let py = Math.floor(Y / PX); py < (Y + H) / PX; py++) for (let px = Math.floor(X / PX); px < (X + W) / PX; px++) bx.push(px), by.push(py);
      [ax, ay] = [X + W / 2, Y + H];
    }
  }
  function place() {
    let x0 = Infinity;
    for (const v of bx) x0 = Math.min(x0, v);
    top.length = 0;
    for (let i = 0; i < bx.length; i++) { const j = bx[i]  - x0; if (top[j] === undefined || by[i]  < top[j] ) top[j] = by[i] ; }
    const fx = ax / PX, fy = ay / PX;
    tongues = [];
    for (let j = 0; j < top.length; j += 2) if (top[j] !== undefined) tongues.push([x0 + j - fx, 5 + 5 * hash(j, 2), 1.5 + 0.6 * hash(j, 3), top[j]  - fy + 1]);
    for (let k = 0; k < 4 && bx.length; k++) {
      const i = Math.floor(hash(k, 9) * bx.length);
      tongues.push([bx[i]  - fx, 4 + 3 * hash(k, 4), 1.3, by[i]  - fy + 1]);
    }
  }
  function height(i        ) {
    const h = tongues[i] [1], n = SEED + i;
    const leap = Math.max(0, noise(t * 2.6 + n * 3.1, n + 70) - 0.55) * 1.6;
    return (h + 0.25 * h * noise(t * 3.3 + n * 1.7, n) + h * leap) * (0.9 + 0.1 * flick(t)) * S * lv * (1 + stretch);
  }
  function tip(i        )                   {
    const [dx, , , dy] = tongues[i] , h = height(i);
    return [x + (dx + lean * h * 0.9) * PX, y + (dy - h * 0.88 + 4) * PX];
  }
  function move(dt        ) {
    if (!placed) (x = ax), (y = ay), (placed = true);
    if (dt <= 0) return;
    const k = 1 - Math.exp(-dt * 10), kl = 1 - Math.exp(-dt * 7);
    vx += ((ax - x) / dt - vx) * k;
    vy += ((ay - y) / dt - vy) * k;
    x = ax;
    y = ay;
    lean += (clamp((-vx + WIND) / 520, -1.3, 1.3) - lean) * kl;
    stretch += (clamp(vy / 900, -0.3, 0.45) - stretch) * kl;
  }
  function shed(dt        ) {
    const speed = Math.hypot(vx, vy), L = lv * 0.7;
    for (let i = 0; i < tongues.length; i++) {
      if (L <= 0.02) continue;
      if (R.chance(0.18 * L)) {
        const [tx, ty] = tip(i);
        ps.spawn(FLAME, tx + R.range(-2, 2), ty + R.range(0, 8), R.range(-8, 8) + WIND * 0.3, R.range(-60, -30), R.range(0.14, 0.3), 0, R.range(0.8, 1.6) * sS, R.chance(0.45));
      }
      if (R.chance((0.075 + speed / 2700) * L)) {
        const [tx, ty] = tip(i);
        licks.push({ x: tx / PX, y: ty / PX, vx: R.range(-6, 6) + WIND * 0.15, vy: R.range(-40, -24), s: R.range(0.9, 1.7) * sS, life: 0.26, max: 0.26 });
      }
      if (R.chance(0.024 * L * S)) ps.spawn(EMBER, x + (tongues[i] [0] + R.range(-3, 3)) * PX, y - R.range(10, 24) * S, R.range(-30, 30) + WIND * 0.4, R.range(-120, -50), R.range(0.9, 2.2));
      if (R.chance(0.017 * L)) {
        const [tx, ty] = tip(i);
        ps.spawn(SMOKE_K, tx, ty - 6, R.range(-5, 5) + WIND * 0.5, R.range(-34, -20), R.range(1.6, 2.6), SMOKE, R.range(1.6, 2.8) * sS);
      }
    }
    for (let i = licks.length - 1; i >= 0; i--) {
      const l = licks[i] ;
      if ((l.life -= dt) <= 0) { licks.splice(i, 1); continue; }
      l.x += l.vx * dt + noise(t * 8 + i, 3) * 0.15;
      l.y += l.vy * dt;
    }
  }
  function flames(buf    , light    ) {
    for (let i = 0; i < bx.length; i++) {
      const h = hash(bx[i]  * 73 + by[i]  * 151, 5);
      if (h > 0.2) continue;
      const T = clamp(0.4 + 0.6 * noise(t * (5 + h * 20), bx[i]  * 7 + by[i] )) * lv;
      if (T > 0.45) buf.set(bx[i] , by[i] , HEAT[Math.min(9, 2 + Math.floor((1 - T) * 7))] );
    }
    const fx = x / PX, fy = y / PX, n = tongues.length;
    const order = tongues.map((_, i) => i).sort((a, b) => Math.abs(tongues[b] [0]) - Math.abs(tongues[a] [0]));
    for (const i of order) {
      const [dx, , w, dy] = tongues[i] , h = height(i), m = SEED + i;
      if (h < 1) continue;
      tongue(buf, fx + dx, fy + dy + 1, h, w * sS * (1 - 0.25 * Math.abs(lean)), noise(t * 2.2 + m, m + 40) * 2 * S + lean * h * 0.9 - clamp(dx * 0.25, -2, 2), t, m * 13, RAMP);
    }
    for (const l of licks) {
      const k = l.life / l.max, r = l.s * (0.4 + 0.6 * k);
      buf.disc(l.x, l.y, r + 0.6, k > 0.5 ? RAMP[5]  : RAMP[6] );
      if (k > 0.35) buf.disc(l.x, l.y - 0.3, r * 0.6, k > 0.7 ? RAMP[2]  : RAMP[4] );
    }
    const fl = flick(t), br = 0.92 + 0.08 * Math.sin(t * 2.1);
    if (n <= 7) {
      const k = fl * Math.max(0.15, n ? lv : 0) * Math.min(1, (n ? lv : 0) * 4), g = GL * sS;
      light.glow(fx + lean * 4, fy - 8 * S, 70 * g * br * (0.9 + 0.1 * fl), GLOW, 0.4 * k);
      light.glow(fx, fy - 6 * S, 22 * g, RAMP[2] , 0.32 * k);
      light.glow(fx, fy - 2, 9 * GL, RAMP[0] , 0.18 * k);
    } else
      for (let i = 2; i < n; i += 5) {
        const [dx, , , dy] = tongues[i] ;
        light.glow(fx + dx, fy + dy - 10 * S, 50 * GL * sS * br, GLOW, 0.36 * fl * lv);
        light.glow(fx + dx, fy + dy - 3, 16 * GL * sS, RAMP[2] , 0.26 * fl * lv);
      }
  }
  return {
    update(dt        ) {
      t += dt;
      read();
      place();
      lv = lit();
      move(dt);
      shed(dt);
      if (bx.length && R.chance(0.7 * lv)) {
        const i = Math.floor(R.next() * bx.length);
        ps.spawn(FLAME, bx[i]  * PX, by[i]  * PX, R.range(-10, 10) - vx * 0.2, R.range(-80, -40), R.range(0.16, 0.3), 0, R.range(1, 1.8) * sS);
      }
      if (bx.length && R.chance(0.16 * lv)) ps.spawn(SMOKE_K, bx[0]  * PX, by[0]  * PX - 8, R.range(-6, 6) - vx * 0.3, R.range(-40, -20), R.range(1.2, 2), SMOKE, R.range(2, 3.2));
      ps.update(dt, t);
    },
    draw(f       , layer        ) {
      const buf = new Px(f, f.color), light = new Px(f, f.light);
      if (layer !== "front") ps.draw(buf, light, true, t);
      if (layer !== "back") { flames(buf, light); ps.draw(buf, light, false, t); }
    },
    stop() { if (stopAt > t) stopAt = t; },
    done: () => t > stopAt + 1.2 && ps.list.length === 0,
  };
}
                                                                                                     
function flick(t        ) { return 0.74 + 0.16 * noise(t * 7.3, 1) + 0.1 * noise(t * 19, 2); }
function tongue(buf    , x        , y        , h        , w        , sx        , t        , n        , ramp9                   ) {
  if (h < 1) return;
  for (const [lw, lh, ri] of LAYERS) {
    const H = h * lh, col = ramp9[ri] ;
    for (let r = 0; r <= H; r++) {
      const u = r / Math.max(1, H);
      const half = w * lw * Math.pow(1 - u, 0.85) * Math.min(1, (r + 1.5) / 3.5) + noise(t * 9 + r * 0.45, n) * 0.5;
      const cx = x + sx * u * u * lh + noise(t * 4 + r * 0.2, n + 7) * u * 1.1;
      if (half < 0.3) continue;
      for (let px = Math.round(cx - half); px <= Math.round(cx + half); px++) buf.set(px, Math.round(y - r), col);
    }
  }
}
const LAYERS                             = [[1, 1, 6], [0.76, 0.86, 4], [0.54, 0.68, 2], [0.3, 0.42, 0]];
const PX = 2;
class Px {
  w        ; h        ; ox        ; oy        ; data             ;
  constructor(f       , data             ) { this.w = f.w; this.h = f.h; this.ox = f.ox; this.oy = f.oy; this.data = data; }
  at(x        , y        ) { x = (x - this.ox) | 0; y = (y - this.oy) | 0; return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x; }
  set(x        , y        , c        ) { const i = this.at(x, y); if (i >= 0) this.data[i] = c; }
  blend(x        , y        , c        , a        ) {
    x = (x - this.ox) | 0;
    y = (y - this.oy) | 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x, d = this.data[i] , oa = a + ((d >>> 24) / 255) * (1 - a);
    if (oa <= 0) return;
    const k = a / oa;
    const r = (c & 255) * k + (d & 255) * (1 - k), g = ((c >>> 8) & 255) * k + ((d >>> 8) & 255) * (1 - k), b = ((c >>> 16) & 255) * k + ((d >>> 16) & 255) * (1 - k);
    this.data[i] = ((oa * 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  add(x        , y        , c        , k        ) {
    const i = (y - this.oy) * this.w + (x - this.ox), d = this.data[i] ;
    const r = Math.min(255, (d & 255) + (c & 255) * k), g = Math.min(255, ((d >>> 8) & 255) + ((c >>> 8) & 255) * k), b = Math.min(255, ((d >>> 16) & 255) + ((c >>> 16) & 255) * k);
    this.data[i] = (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  disc(cx        , cy        , r        , c        , a = 1) {
    if (a <= 0.01) return;
    if (r <= 0.5 && a >= 1) return this.set(Math.round(cx), Math.round(cy), c);
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= r2) a >= 1 ? this.set(x, y, c) : this.blend(x, y, c, a);
      }
    }
  }
  glow(cx        , cy        , r        , c        , k        ) {
    if (r < 1 || k <= 0.01) return;
    const x0 = Math.max(this.ox, Math.floor(cx - r)), x1 = Math.min(this.ox + this.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(this.oy, Math.floor(cy - r)), y1 = Math.min(this.oy + this.h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / r;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / r, d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const f = 1 - Math.sqrt(d);
        this.add(x, y, c, f * f * k);
      }
    }
  }
}
function rgb(r        , g        , b        , a = 255) { return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255); }
function hex(h        ) { const v = parseInt(h.slice(1), 16); return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255); }
function mix(c1        , c2        , t        ) {
  const u = 1 - t, ch = (c        , s        ) => (c >>> s) & 255;
  return rgb(ch(c1, 0) * u + ch(c2, 0) * t, ch(c1, 8) * u + ch(c2, 8) * t, ch(c1, 16) * u + ch(c2, 16) * t, ch(c1, 24) * u + ch(c2, 24) * t);
}
function ramp(stops                   , t        ) {
  const u = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1), i = Math.floor(u);
  return mix(stops[i] , stops[i + 1] , u - i);
}
const FIRE = ["#ffffff", "#fff3a6", "#ffe26b", "#ffc23d", "#ff8a2a", "#f2561d", "#c9281f", "#8a1f17", "#4a1712"].map(hex);
const SMOKE_RAMP = ["#7b6f72", "#5d5660", "#433d48", "#2b2630", "#1a171e"].map(hex);
const SMOKE1 = hex("#5b5566"), SOOT = hex("#0d0a12"), WARM = rgb(255, 176, 96);
class Rng {
  s        ;
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a        , b        ) { return a + (b - a) * this.next(); }
  chance(p        ) { return this.next() < p; }
}
function clamp(v        , a = 0, b = 1) { return v < a ? a : v > b ? b : v; }
function smooth(a        , b        , x        ) { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }
function hash(n        , k = 0) { return ((Math.imul(n + 1 + k * 7919, 2654435761) >>> 0) % 100000) / 100000; }
function noise(x        , seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = hash(i, seed) * 2 - 1;
  return a + (hash(i + 1, seed) * 2 - 1 - a) * u;
}
const FLAME = 0, SMOKE_K = 1, EMBER = 2;
                                                                                                                                                            
class Particles {
  list      = [];
  R     ;
  ramp                   ;
  constructor(R     , ramp9                   ) { this.R = R; this.ramp = ramp9; }
  spawn(k        , x        , y        , vx        , vy        , life        , col = 0, size = 1, smokes = false) {
    this.list.push({ k, x, y, vx, vy, life, max: life, col, size, seed: this.R.next() * 100, smokes });
  }
  update(dt        , t        ) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i] ;
      if ((p.life -= dt) <= 0) {
        if (p.smokes) this.spawn(SMOKE_K, p.x, p.y, p.vx * 0.6, p.vy * 0.6 - 12, this.R.range(0.8, 1.4), 0, p.size * 0.7);
        L.splice(i, 1);
        continue;
      }
      if (p.k === FLAME) {
        p.vy -= 190 * dt;
        p.vx += Math.sin(t * 17 + p.seed) * 60 * dt;
        p.vx -= p.vx * 5 * dt;
        p.vy -= p.vy * 3.2 * dt;
      } else if (p.k === SMOKE_K) { p.vy -= 32 * dt; p.vx += Math.sin(t * 1.3 + p.seed) * 16 * dt; p.vx -= p.vx * 1.6 * dt; p.vy -= p.vy * 1.2 * dt; } else {
        p.vy += (-60 + Math.sin(t * 3 + p.seed) * 40) * dt;
        p.vx += Math.cos(t * 2.3 + p.seed) * 90 * dt;
        p.vx -= p.vx * 1.6 * dt;
        p.vy -= p.vy * 1.6 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  draw(buf    , light    , smoke         , t        ) {
    const r9 = this.ramp;
    for (const p of this.list) {
      if ((p.k === SMOKE_K) !== smoke) continue;
      const k = p.life / p.max, age = 1 - k, ax = p.x / PX, ay = p.y / PX;
      if (p.k === SMOKE_K) {
        const r = p.size * (0.65 + Math.min(1, age * 2.5) * 0.45 + age * 0.4), a = Math.min(1, age * 12) * Math.min(1, k * 2.4) * 0.55;
        const c = p.col ? mix(p.col, ramp(SMOKE_RAMP, age), age) : ramp(SMOKE_RAMP, age * 1.05);
        buf.disc(ax, ay, r, c, a * 0.45);
        buf.disc(ax + r * 0.05, ay + r * 0.06, r * 0.74, c, a * 0.62);
        if (age < 0.5) buf.disc(ax - r * 0.22, ay - r * 0.3, r * 0.5, mix(c, r9[0] , 0.12), a * 0.4 * (1 - age * 2));
      } else if (p.k === FLAME) {
        const heat = Math.min(0.999, Math.pow(age, 0.62) + (p.seed % 1) * 0.1), idx = Math.min(7, Math.floor(heat * 8));
        const r = p.size * (0.55 + 0.45 * Math.min(1, age * 7)) * (1 - age * 0.55), c = r9[idx] ;
        if (idx >= 7) buf.disc(ax, ay, r, c, Math.min(1, k * 3) * 0.85);
        else {
          buf.disc(ax, ay, r, r9[Math.min(8, idx + 2)] );
          buf.disc(ax - r * 0.16, ay - r * 0.22, r * 0.78, c);
          if (r > 1.6) buf.disc(ax, ay - r * 0.9, r * 0.42, c);
          if (idx <= 3 && r > 1.8) buf.disc(ax - r * 0.28, ay - r * 0.34, r * 0.36, r9[Math.max(0, idx - 1)] );
          if (idx < 6) light.glow(ax, ay, r * 2.4 + 2, c, 0.18 * k);
        }
      } else {
        const c = k > 0.5 ? (Math.sin(t * 22 + p.seed * 3) > -0.2 ? r9[2]  : r9[4] ) : k > 0.2 ? r9[4]  : r9[6] ;
        buf.set(Math.floor(ax), Math.floor(ay), c);
        light.glow(ax, ay, 3, c, 0.3 * k);
      }
    }
  }
}

window.SF_VFX.fire = fire;
})();
(() => {
// Made by Sprite Fusion, to have full context over VFX, connect to the MCP: https://www.spritefusion.com/mcp
// MIT License
// Copyright (c) 2026 Hugo Duprez
                                                                                                               
                                     
                                               
                        
                           
                                               
                                                                                   
 
                          
              
             
                                            
                          
                
                
                             
                
                               
 
function poison(o          = {}) {
  const R = new Rng(o.seed ?? 1);
  const groundAt = (x        ) => (o.ground === undefined ? 600 : typeof o.ground === "number" ? o.ground : o.ground(x));
  const P = o.colors && o.colors.length >= 8 ? o.colors : POISON;
  const c      = { o, R, P, ground: groundAt, ps: new Particles(R), bits: new Bits(groundAt), gas: new Gas(), lights: new Lights() };
  const kind = o.kind ?? "cloud";
  const scene = kind === "puddle" ? puddle(c) : kind === "aura" ? aura(c) : cloud(c);
  let t = 0;
  return {
    update(dt        ) {
      t += dt;
      scene.update(t);
      c.bits.step(dt, (b) => { if (b.kind !== DROP) return; b.life = Math.min(b.life, 0.25); if (b.s > 1 && scene.stain) scene.stain(b.x, b.y, t); });
      c.gas.prune(t);
      c.lights.update(dt);
      c.ps.update(dt);
    },
    draw(f       , layer        ) {
      const buf = new Px(f, f.color), light = new Px(f, f.light);
      if (layer !== "front") scene.back(buf, light, t);
      if (layer !== "back") { scene.front(buf, light, t); drawBits(buf, c); c.ps.draw(buf, light); c.lights.draw(light); }
    },
    stop() { scene.stop?.(t); },
    done: () => scene.over(t) && c.ps.list.length === 0 && c.bits.list.length === 0 && c.gas.list.length === 0,
  };
}
                                                                                                                                              
                 
                          
                                            
                                             
                           
                         
                                                
 
const GLASS = 0, DROP = 1, BUBBLE = 2;
function drawBits(buf    , c     ) {
  const P = c.P;
  for (const b of c.bits.list) {
    const x = b.x / PX, y = b.y / PX, fa = Math.min(1, b.life / 0.3);
    if (b.kind === GLASS) { dot(buf, x, y, b.c, fa); dot(buf, x + Math.cos(b.a), y + Math.sin(b.a), hex("#62c8f4"), fa); } else if (b.kind === DROP) {
      dot(buf, x, y, P[1] , fa);
      if (b.s > 1) dot(buf, x, y - 1, P[3] , fa);
    } else if (b.life < 0.06) { for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) dot(buf, x + dx , y + dy , P[1] ); } else {
      buf.ring(x, y, b.s, 1, P[2] );
      dot(buf, x - 0.6, y - 0.8, PAL.white);
    }
  }
}
function cloud(c     )        {
  const { o, R, P, ps, bits, gas } = c;
  const X = o.x ?? 790, SPREAD = o.size ?? 1, LAND = 0.5;
  const G = c.ground(X), vial = flask(P);
  const hand = o.from ? { x: o.from[0], y: o.from[1] + 10 } : o.actor?.hand ? o.actor.hand() : { x: X - 330, y: G - 80 };
  const ox = hand.x, oy = hand.y - 10;
  let smashed = false;
  return {
    update(t) {
      if (t >= LAND && !smashed) {
        smashed = true;
        o.shake?.(0.25);
        c.lights.add(X, G - 10, 120, P[2] , 0.8, 0.2);
        for (let i = 0; i < 10; i++) bits.add({ kind: GLASS, x: X, y: G - 4, vx: R.range(-260, 260), vy: -R.range(150, 420), g: 1, drag: 0.4, bounce: 0.35, life: R.range(0.6, 1.1), a: R.range(0, TAU), va: R.range(-20, 20), s: R.range(1.5, 2.5), c: hex("#d8f6ff") });
        for (let i = 0; i < 14; i++) bits.add({ kind: DROP, x: X, y: G - 4, vx: R.range(-200, 200), vy: -R.range(100, 360), g: 0.9, life: 1.2, s: R.int(1, 2) });
        for (let i = 0; i < 16; i++) {
          const a = -Math.PI / 2 + R.range(-1.4, 1.4), sp = R.range(60, 220);
          gas.add(t, X + R.range(-10, 10), G - 16, Math.cos(a) * sp * 1.3 * SPREAD, Math.sin(a) * sp * 0.9 - 30, R.range(3, 5), R.range(9, 17), R.range(3.4, 4.1), 0, true);
        }
      }
      if (smashed && t < 2.2 && R.chance(0.28 * (1 - (t - LAND) / 1.7))) gas.add(t, X + R.range(-70, 70) * SPREAD, G - R.range(10, 40), R.range(-50, 50) * SPREAD, R.range(-90, -20), R.range(3, 5), R.range(8, 16), R.range(3.3, 4.1), 0, true);
      if (smashed && t < 3.2) {
        if (R.chance(0.18)) bits.add({ kind: BUBBLE, x: X + R.range(-90, 90) * SPREAD, y: G - R.range(8, 40), vy: -R.range(16, 40), life: R.range(0.5, 1), s: R.chance(0.3) ? 2 : 1.4 });
        if (R.chance(0.08)) bits.add({ kind: DROP, x: X + R.range(-80, 80) * SPREAD, y: G - R.range(20, 40), vy: 20, g: 0.5, life: 1.2, s: 1 });
        if (R.chance(0.2)) ps.spawn(X + R.range(-100, 100) * SPREAD, G - R.range(20, 90), R.range(-12, 12), -R.range(14, 36), R.range(1.2, 2.2), R.chance(0.6) ? P[2]  : P[1] , R.range(1, 2.2));
      }
    },
    back(buf, light, t) {
      if (!smashed) return;
      const cx = X / PX, cy = G / PX, k = smooth(LAND, LAND + 0.8, t) * (1 - smooth(3.4, 4.2, t)), w = 52 * SPREAD;
      for (let x = Math.floor(cx - w); x <= cx + w; x++) {
        const d = Math.abs(x - cx) / w, h = hash(x, 41);
        if (h * 0.6 + d < k * 1.1) { dot(buf, x, cy, d < 0.5 ? P[4]  : P[5] ); if (h < 0.5) dot(buf, x, cy + 1, P[6] , k); }
      }
      light.glow(cx, cy - 14, 90 * SPREAD, P[3] , 0.3 * gas.density(t, c.ground) * (0.85 + 0.15 * Math.sin(t * 4)));
    },
    front(buf, light, t) {
      if (t < LAND) {
        const k = clamp(t / LAND), x = lerp(ox, X, k), y = lerp(oy, G - 6, k) - Math.sin(Math.PI * k) * 110;
        blitRot(buf, vial, x / PX, y / PX, t * 16);
        light.glow(x / PX, y / PX, 8, P[2] , 0.4);
        return;
      }
      gas.draw(buf, light, t, c.ground, P, 1);
    },
    over: (t) => t > 4.3,
  };
}
function puddle(c     )        {
  const { o, R, P, ps, bits, gas } = c;
  const X = o.x ?? 760, S = o.size ?? 1, G = c.ground(X), cx = X / PX, cy = G / PX, W = 44 * S;
  const bubbles                                                       = [];
  const pops                                        = [];
  let stopAt = Infinity;
  const width = (t        ) => W * outCubic(t / 0.6) * (1 - smooth(stopAt, stopAt + 1.4, t));
  const live = (t        ) => t < stopAt;
  return {
    update(t) {
      if (t < 0.05 && bits.list.length === 0) {
        for (let i = 0; i < 10; i++) bits.add({ kind: DROP, x: X + R.range(-10, 10), y: G - 4, vx: R.range(-180, 180), vy: -R.range(80, 260), g: 0.9, life: 1.2, s: R.int(1, 2) });
        o.shake?.(0.08);
      }
      const w = width(t);
      if (live(t) && t > 0.3 && R.chance(0.09 * S + 0.04)) bubbles.push({ x: cx + R.range(-0.8, 0.8) * w, t0: t, life: R.range(0.45, 1), r: R.range(1.5, 3.4) });
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i] ;
        if (t - b.t0 < b.life) continue;
        bubbles.splice(i, 1);
        if (Math.abs(b.x - cx) > width(t)) continue;
        pops.push({ x: b.x, y: surface(b.x, cx, cy, width(t)), t });
        for (let j = 0; j < 2 + Math.round(b.r); j++) bits.add({ kind: DROP, x: b.x * PX, y: (cy - 2) * PX, vx: R.range(-90, 90), vy: -R.range(90, 200), g: 0.8, life: 0.9, s: 1 });
        gas.add(t, b.x * PX, (cy - 3) * PX, R.range(-15, 15), -R.range(30, 50), b.r * 0.9, b.r * 2.6, t + R.range(1.4, 2), 18);
        if (R.chance(0.5)) ps.spawn(b.x * PX, (cy - 4) * PX, R.range(-10, 10), -R.range(20, 40), R.range(1.2, 2), R.chance(0.6) ? P[2]  : P[1] , R.range(1, 2));
      }
      for (let i = pops.length - 1; i >= 0; i--) if (t - pops[i] .t > 0.1) pops.splice(i, 1);
      if (live(t) && t > 0.2 && R.chance(0.075 * S)) gas.add(t, X + R.range(-0.8, 0.8) * w * PX, G - 4, R.range(-12, 12), -R.range(20, 40), R.range(2, 3), R.range(6, 9), t + R.range(1.6, 2.4), 22);
      if (live(t) && R.chance(0.05)) ps.spawn(X + R.range(-0.8, 0.8) * w * PX, G - R.range(10, 40), R.range(-8, 8), -R.range(14, 30), R.range(1.4, 2.2), R.chance(0.6) ? P[2]  : P[1] , R.range(1, 2));
    },
    back(buf, light, t) {
      const w = width(t);
      if (w < 1) return;
      const dry = smooth(stopAt, stopAt + 1.4, t);
      for (let x = Math.floor(cx - w * 1.3); x <= cx + w * 1.3; x++) {
        const d = Math.abs(x - cx) / w;
        if (d > 1 && hash(x, 41) < 1.3 - d) dot(buf, x, cy, P[5] , 1 - dry * 0.6);
      }
      for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
        const d = Math.abs(x + 0.5 - cx) / w;
        if (d > 1) continue;
        const top = surface(x, cx, cy, w);
        for (let y = top; y <= cy; y++) {
          let col = y === top ? P[2]  : y === cy ? P[5]  : P[4] ;
          if (d > 0.9) col = y === top ? P[4]  : P[5] ;
          if (y === top && d < 0.9) {
            const n = noise(x * 0.18 - t * 1.6, 3) + noise(x * 0.07 + t * 0.9, 4) * 0.6;
            if (n > 0.55) col = P[1] ;
            if (n > 0.95 && hash(x, Math.floor(t * 6)) < 0.3) col = PAL.white;
          } else if (y === top + 1 && d < 0.85 && noise(x * 0.12 + t * 0.7, 5) > 0.3) col = P[3] ;
          buf.set(x, y, col);
        }
        if (d > 0.97) buf.set(x, top - 1, OUTLINE);
      }
      light.glow(cx, cy - 6, w * 2.4 + 10, P[3] , 0.34 * (1 - dry) * (0.85 + 0.15 * Math.sin(t * 3.4)) * smooth(0, 0.4, t));
      light.glow(cx, cy - 2, w * 1.1, P[2] , 0.18 * (1 - dry));
    },
    front(buf, light, t) {
      for (const b of bubbles) {
        const k = (t - b.t0) / b.life, r = b.r * (0.3 + 0.7 * outCubic(k * 1.3)), sy = surface(b.x, cx, cy, width(t));
        for (let y = Math.floor(sy - r); y <= sy; y++)
          for (let x = Math.floor(b.x - r - 1); x <= Math.ceil(b.x + r + 1); x++) {
            const dx = x + 0.5 - b.x, dy = y + 0.5 - sy, d = Math.hypot(dx, dy);
            if (d > r + 0.5) continue;
            if (d > r - 0.7) buf.set(x, y, dx < 0 && dy < -r * 0.3 ? P[1]  : P[3] );
            else buf.blend(x, y, P[2] , 0.3);
          }
        dot(buf, b.x - r * 0.4, sy - r * 0.6, PAL.white);
        light.glow(b.x, sy - r * 0.5, r * 2 + 3, P[2] , 0.2);
      }
      for (const p of pops) {
        const k = (t - p.t) / 0.1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0.6, -0.7], [-0.6, -0.7], [0, -1]]) dot(buf, p.x + dx  * (2 + 3 * k), p.y + dy  * (2 + 3 * k), P[1] , 1 - k);
      }
      gas.draw(buf, light, t, c.ground, P, 0.5);
    },
    over: (t) => t > stopAt + 1.5,
    stop(t) { stopAt = Math.min(stopAt, t); },
  };
}
function surface(x        , cx        , cy        , w        ) {
  const d = Math.min(1, Math.abs(x + 0.5 - cx) / Math.max(1, w));
  return cy - Math.round(Math.sqrt(1 - d * d) * Math.min(2.4, 0.9 + w * 0.04));
}
function aura(c     )        {
  const { o, R, P, ps, bits, gas } = c;
  const A = o.actor;
  const stains                                                   = [];
  let stopAt = Infinity, sil             = null;
  const where = () => {
    const [fx, fy] = A ? A.feet() : [o.x ?? 640, c.ground(o.x ?? 640)];
    const s = A?.silhouette?.();
    if (s && s.w > 0) {
      let x0 = s.w, y0 = s.h, x1 = -1, y1 = -1;
      for (let y = 0; y < s.h; y++)
        for (let x = 0; x < s.w; x++)
          if (s.data[y * s.w + x]  >>> 24) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      sil = { x: s.x, y: s.y, w: s.w, h: s.h, data: s.data, bx0: s.x + x0, by0: s.y + y0, bx1: s.x + x1, by1: s.y + y1 };
    } else sil = null;
    return sil ? { x0: sil.bx0, y0: sil.by0, x1: sil.bx1, y1: sil.by1 } : { x0: fx / PX - 6, y0: fy / PX - 46, x1: fx / PX + 6, y1: fy / PX };
  };
  const on = (box                                                    , u0        , u1        )                   => {
    for (let k = 0; k < 24; k++) {
      const x = R.range(box.x0, box.x1 + 1), y = lerp(box.y0, box.y1, R.range(u0, u1));
      const s = sil              ;
      if (!s || s.data[Math.floor(y - s.y) * s.w + Math.floor(x - s.x)]  >>> 24) return [x, y];
    }
    return [(box.x0 + box.x1) / 2, lerp(box.y0, box.y1, (u0 + u1) / 2)];
  };
  let box = { x0: 0, y0: 0, x1: 0, y1: 0 };
  const level = (t        ) => smooth(0, 0.4, t) * (1 - smooth(stopAt, stopAt + 0.7, t));
  return {
    update(t) {
      box = where();
      if (t >= stopAt) return;
      if (R.chance(0.11)) {
        const [x, y] = on(box, 0.35, 0.95);
        bits.add({ kind: DROP, x: x * PX, y: y * PX, vy: R.range(0, 30), vx: R.range(-10, 10), g: 0.7, life: 1.4, s: R.chance(0.5) ? 2 : 1 });
      }
      if (R.chance(0.09)) {
        const [x, y] = on(box, 0.1, 0.8);
        bits.add({ kind: BUBBLE, x: x * PX, y: y * PX, vx: R.range(-14, 14), vy: -R.range(20, 46), life: R.range(0.4, 0.8), s: R.chance(0.3) ? 1.6 : 1.1 });
      }
      if (R.chance(0.1)) {
        const [x, y] = on(box, 0, 0.35);
        gas.add(t, x * PX, y * PX, R.range(-10, 10), -R.range(26, 44), R.range(1.5, 2.5), R.range(4.5, 7), t + R.range(1.2, 1.8), 26);
      }
      if (R.chance(0.06)) ps.spawn((box.x0 + box.x1) * 0.5 * PX + R.range(-20, 20), box.y0 * PX + R.range(0, 40), R.range(-10, 10), -R.range(16, 34), R.range(1.2, 2), R.chance(0.6) ? P[2]  : P[1] , R.range(0.8, 1.8));
    },
    back(buf, light, t) {
      const k = level(t), fy = c.ground((box.x0 + box.x1) * PX * 0.5) / PX, fx = (box.x0 + box.x1) / 2;
      const w = 6 + 8 * smooth(0, 3, t);
      for (let x = Math.floor(fx - w); x <= fx + w; x++) if (hash(x, 43) < 1.15 - Math.abs(x - fx) / w) dot(buf, x, fy, hash(x, 44) < 0.5 ? P[4]  : P[5] , 0.85 * Math.max(k, 0.3));
      for (const s of stains) {
        const a = 1 - smooth(s.t + 1.5, s.t + 3, t);
        for (let x = Math.floor(s.x - s.r); x <= s.x + s.r; x++) dot(buf, x, s.y, Math.abs(x - s.x) < s.r * 0.5 ? P[4]  : P[5] , a);
      }
      light.glow(fx, fy - 2, 18, P[3] , 0.2 * k);
    },
    front(buf, light, t) {
      const k = level(t);
      if (k <= 0.01) return;
      const s = sil              ;
      if (s) {
        const v = ((t * 0.9) % 1.15) / 0.95, H = Math.max(1, s.by1 - s.by0);
        for (let y = s.by0; y <= s.by1; y++) {
          const u = (s.by1 - y) / H, band = Math.exp(-(((u - v) / 0.13) ** 2));
          for (let x = s.bx0; x <= s.bx1; x++) {
            const col = s.data[(y - s.y) * s.w + (x - s.x)] ;
            if (!(col >>> 24)) continue;
            buf.blend(x, y, band > 0.5 ? P[1]  : P[2] , k * (0.12 + 0.42 * band));
          }
        }
      }
      gas.draw(buf, light, t, c.ground, P, 0.55);
      const cxb = (box.x0 + box.x1) / 2, cyb = (box.y0 + box.y1) / 2;
      light.glow(cxb, cyb, (box.y1 - box.y0) * 0.9 + 8, P[3] , 0.28 * k * (0.8 + 0.2 * Math.sin(t * 7)));
    },
    over: (t) => t > stopAt + 0.8,
    stop(t) { stopAt = Math.min(stopAt, t); },
    stain(x, y, t) { stains.push({ x: x / PX, y: Math.round(y / PX), t, r: R.range(1.2, 2.6) }); if (stains.length > 40) stains.shift(); },
  };
}
                                                                                                                                   
function flask(P                   ) {
  return sprite(["..ccc..", ".occo..", "..ogo..", ".ogvgo.", "ogvvvdo", "ogvvvdo", ".odddo.", "..ooo.."], { o: OUTLINE, g: hex("#d8f6ff"), c: hex("#9b6a45"), v: P[2] , d: P[4]  });
}
                                                                                                                                                          
class Gas {
  list         = [];
  n = 0;
  add(t        , x        , y        , vx        , vy        , r0        , r1        , end        , rise = 0, hug = false) {
    this.list.push({ x, y, vx, vy, r0, r1, t0: t, end, seed: (this.n++ * 37.7) % 100, rise, hug });
  }
  prune(t        ) { for (let i = this.list.length - 1; i >= 0; i--) if (t > this.list[i] .end) this.list.splice(i, 1); }
  at(p      , t        , ground                       ) {
    const age = t - p.t0, e = 1 - Math.exp(-age * 2.2);
    const x = p.x + (p.vx / 2.2) * e + noise(t * 0.7 + p.seed, 1) * 6 * Math.min(1, age);
    let y = p.y + (p.vy / 2.2) * e - p.rise * age + noise(t * 0.6 + p.seed, 2) * 4 * Math.min(1, age);
    const r = p.r0 + (p.r1 - p.r0) * outCubic(age / 1.4);
    if (p.hug) y = Math.min(y, ground(x) - r * PX * 0.7);
    const a = smooth(0, 0.15, age) * (1 - smooth(p.end - (p.hug ? 0.9 : (p.end - p.t0) * 0.6), p.end, t));
    return { x: x / PX, y: y / PX, r, a, age: clamp(age / (p.hug ? 2.6 : p.end - p.t0)) };
  }
  density(t        , ground                       ) {
    let s = 0;
    for (const p of this.list) s += this.at(p, t, ground).a;
    return s / Math.max(1, this.list.length);
  }
  draw(buf    , light    , t        , ground                       , P                   , opacity        ) {
    for (const [i, p] of this.list.entries()) {
      const { x, y, r, a: a0, age } = this.at(p, t, ground), a = a0 * opacity;
      if (a < 0.02) continue;
      const c = mix(hash(i, 70) < 0.5 ? P[4]  : mix(P[4] , P[3] , 0.4), P[6] , age * 0.85);
      buf.alphaDisc(x, y, r * 1.08, c, a * 0.4);
      buf.alphaDisc(x + r * 0.05, y + r * 0.08, r * 0.76, c, a * 0.55);
      buf.alphaDisc(x - r * 0.22, y - r * 0.3, r * 0.48, mix(c, P[1] , 0.22), a * 0.38 * (1 - age * 0.6));
      if (r > 9) light.glow(x, y, r * 1.5, P[3] , 0.06 * a);
    }
  }
}
const PX = 2;
class Px {
  w        ; h        ; ox        ; oy        ; data             ;
  constructor(f       , data             ) { this.w = f.w; this.h = f.h; this.ox = f.ox; this.oy = f.oy; this.data = data; }
  at(x        , y        ) { x = (x - this.ox) | 0; y = (y - this.oy) | 0; return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x; }
  set(x        , y        , c        ) { const i = this.at(x, y); if (i >= 0) this.data[i] = c; }
  blend(x        , y        , c        , a        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , oa = a + ((d >>> 24) / 255) * (1 - a);
    if (oa <= 0) return;
    const k = a / oa, j = 1 - k, r = (c & 255) * k + (d & 255) * j, g = ((c >>> 8) & 255) * k + ((d >>> 8) & 255) * j, b = ((c >>> 16) & 255) * k + ((d >>> 16) & 255) * j;
    this.data[i] = ((oa * 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  add(x        , y        , c        , k        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , r = Math.min(255, (d & 255) + (c & 255) * k), g = Math.min(255, ((d >>> 8) & 255) + ((c >>> 8) & 255) * k), b = Math.min(255, ((d >>> 16) & 255) + ((c >>> 16) & 255) * k);
    this.data[i] = (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  alphaDisc(cx        , cy        , r        , c        , a        ) {
    if (a <= 0.01) return;
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx; if (dx * dx + dy * dy <= r2) this.blend(x, y, c, a); }
    }
  }
  ring(cx        , cy        , r        , thick        , c        , alpha = 1) {
    const ro = r + thick * 0.5, ri = Math.max(0, r - thick * 0.5), ro2 = ro * ro, ri2 = ri * ri;
    for (let y = Math.floor(cy - ro); y <= Math.ceil(cy + ro); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - ro); x <= Math.ceil(cx + ro); x++) {
        const dx = x + 0.5 - cx, d2 = dx * dx + dy * dy;
        if (d2 <= ro2 && d2 >= ri2 && (alpha >= 1 || alpha > bayer(x, y))) this.set(x, y, c);
      }
    }
  }
  glow(cx        , cy        , r        , c        , k        ) {
    if (r < 1 || k <= 0.01) return;
    const x0 = Math.max(this.ox, Math.floor(cx - r)), x1 = Math.min(this.ox + this.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(this.oy, Math.floor(cy - r)), y1 = Math.min(this.oy + this.h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / r;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / r, d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const f = 1 - Math.sqrt(d);
        this.add(x, y, c, f * f * k);
      }
    }
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayer(x        , y        ) { return (BAYER[((y & 3) << 2) | (x & 3)]  + 0.5) / 16; }
function dot(buf    , x        , y        , c        , a = 1) {
  const px = Math.floor(x), py = Math.floor(y);
  if (a >= 1 || a > bayer(px, py)) buf.set(px, py, c);
}
                                                            
function sprite(rows          , pal                        )         {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length)), data = new Uint32Array(w * h);
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== "." && ch !== " " && (data[y * w + x] = pal[ch] ?? 0)));
  return { w, h, data };
}
function blitRot(buf    , s        , cx        , cy        , ang        ) {
  const c = Math.cos(ang), sn = Math.sin(ang), r = Math.ceil(Math.hypot(s.w, s.h) / 2) + 1, px0 = Math.round(cx), py0 = Math.round(cy);
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const iu = Math.floor(c * x + sn * y + s.w / 2), iv = Math.floor(-sn * x + c * y + s.h / 2);
      if (iu < 0 || iv < 0 || iu >= s.w || iv >= s.h) continue;
      const col = s.data[iv * s.w + iu] ;
      if (col >>> 24) buf.set(px0 + x, py0 + y, col);
    }
}
function rgb(r        , g        , b        , a = 255) { return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255); }
function hex(h        ) { const v = parseInt(h.replace("#", ""), 16); return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255); }
function mix(c1        , c2        , t        ) {
  const u = 1 - t, ch = (c        , s        ) => (c >>> s) & 255;
  return rgb(ch(c1, 0) * u + ch(c2, 0) * t, ch(c1, 8) * u + ch(c2, 8) * t, ch(c1, 16) * u + ch(c2, 16) * t, ch(c1, 24) * u + ch(c2, 24) * t);
}
const PAL = { white: hex("#ffffff") };
const OUTLINE = hex("#1a1422");
const POISON = ["#f6ffc2", "#cfff63", "#8eea3f", "#55b92f", "#318232", "#23552e", "#173320", "#0e1d14"].map(hex);
class Rng {
          s        ;
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a        , b        ) { return a + (b - a) * this.next(); }
  int(a        , b        ) { return Math.floor(this.range(a, b + 1)); }
  chance(p        ) { return this.next() < p; }
}
const TAU = Math.PI * 2;
function clamp(v        , a = 0, b = 1) { return v < a ? a : v > b ? b : v; }
function lerp(a        , b        , t        ) { return a + (b - a) * t; }
function smooth(a        , b        , x        ) { if (x <= a) return 0; if (x >= b) return 1; const t = (x - a) / (b - a); return t * t * (3 - 2 * t); }
function outCubic(t        ) { return 1 - Math.pow(1 - clamp(t), 3); }
function hash(n        , k = 0) { return ((Math.imul(n + 1 + k * 7919, 2654435761) >>> 0) % 100000) / 100000; }
function noise(x        , seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u);
}
                                                                                                                                
class Particles {
  list      = [];
  t = 0;
  R     ;
  constructor(R     ) { this.R = R; }
  spawn(x        , y        , vx        , vy        , life        , col        , size        ) {
    this.list.push({ x, y, vx, vy, life, max: life, col, size, seed: this.R.next() * 100 });
  }
  update(dt        ) {
    this.t += dt;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i] ;
      if ((p.life -= dt) <= 0) { this.list.splice(i, 1); continue; }
      p.vx -= p.vx * 0.8 * dt;
      p.vy -= p.vy * 0.8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  draw(buf    , light    ) {
    for (const p of this.list) {
      const k = p.life / p.max, ax = p.x / PX, ay = p.y / PX;
      const br = 0.7 + 0.3 * Math.sin(this.t * (2 + (p.seed % 3)) + p.seed), a = Math.min(1, (1 - k) * 5) * Math.min(1, k * 3) * br;
      if (a < 0.05) continue;
      buf.alphaDisc(ax, ay, p.size, p.col, 0.45 * a);
      buf.alphaDisc(ax, ay, p.size * 0.5, PAL.white, 0.5 * a);
      light.glow(ax, ay, 3 + p.size * 3, p.col, 0.35 * a);
    }
  }
}
class Lights {
  list                                                                                             = [];
  add(x        , y        , r        , color        , k        , life        ) { this.list.push({ x, y, r, color, k, life, max: life }); }
  update(dt        ) { for (let i = this.list.length - 1; i >= 0; i--) if ((this.list[i] .life -= dt) <= 0) this.list.splice(i, 1); }
  draw(light    ) {
    for (const l of this.list) { const k = l.life / l.max; light.glow(l.x / PX, l.y / PX, (l.r / PX) * (0.55 + 0.45 * k), l.color, l.k * k * k); }
  }
}
               
            
            
             
             
               
              
            
             
            
            
               
            
               
                 
                
 
class Bits {
  list        = [];
  ground                       ;
  constructor(ground                       ) { this.ground = ground; }
  add(b                                         ) {
    const life = b.life ?? 1;
    this.list.push({ vx: 0, vy: 0, a: 0, va: 0, s: 1, c: 0, kind: 0, g: 0, drag: 0, bounce: 0, rest: false, ...b, life, max: life });
  }
  step(dt        , onLand                                  ) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i] ;
      if ((b.life -= dt) <= 0) { this.list.splice(i, 1); continue; }
      if (b.rest) continue;
      b.vy += 1900 * b.g * dt;
      b.vx -= b.vx * b.drag * dt;
      b.vy -= b.vy * b.drag * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
      const floor = this.ground(b.x);
      if (b.g > 0 && b.y >= floor && b.vy > 0) {
        const sp = b.vy;
        b.y = floor - 0.01;
        onLand?.(b, sp);
        if (b.bounce > 0 && sp > 140) { b.vy = -sp * b.bounce; b.vx *= 0.7; b.va *= 0.6; } else { b.rest = true; b.vx = b.vy = 0; }
      }
    }
  }
}

window.SF_VFX.poison = poison;
window.SF_VFX.hex = hex; // para pasar paletas propias desde el juego (el aura del CABREO)
})();
(() => {
// Made by Sprite Fusion, to have full context over VFX, connect to the MCP: https://www.spritefusion.com/mcp
// MIT License
// Copyright (c) 2026 Hugo Duprez
                                                                                                               
                                     
                                                   
                          
                
             
             
                  
                
                    
                                                   
                                            
                
                               
 
function shield(o          = {}) {
  const R = new Rng(o.seed ?? 1), ground = (x        ) => groundAt(o.ground, x);
  const ps = new Particles(R, ground), lights          = [];
  const actor = o.actor ?? { feet: () => [o.x ?? 600, o.y ?? 600]                     };
  const RAD = o.radius ?? 40, C = o.colors ? o.colors.map(hex) : ICE, S3 = Math.sqrt(3), SPARKS = [WHITE, C[1] , C[2] ];
  let GONE = o.hold ?? 2.75, t = 0;
  const hits = (o.hits ?? HITS).map((h) => ({ ...h, traced: true, done: false }));
  const centre = ()                   => { const [x, y] = actor.feet(); return [x / PX, y / PX]; };
  const surf = (lon        , lat        )                   => {
    const [cx, cy] = centre();
    return [cx + RAD * Math.sin(lon) * Math.cos(lat), cy - RAD * Math.sin(lat)];
  };
  const cell = (gx        , gy        )                   => {
    const q = (S3 / 3) * gx - gy / 3, r = (2 / 3) * gy, s = -q - r;
    let rq = Math.round(q), rr = Math.round(r);
    const rs = Math.round(s), dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    const hx = S3 * (rq + rr / 2), hy = 1.5 * rr, dx = Math.abs(gx - hx), dy = gy - hy;
    return [(rq * 73856093) ^ (rr * 19349663), Math.max(dx, Math.abs(dx / 2 + (dy * S3) / 2), Math.abs(dx / 2 - (dy * S3) / 2)) / (S3 / 2)];
  };
  const ripple = (lon        , lat        ) => {
    let hit = 0;
    for (const hh of hits) {
      const k = t - hh.t;
      if (k < 0 || k > 0.7 || !hh.done) continue;
      const d = Math.acos(clamp(Math.cos(lat) * Math.cos(hh.lat) * Math.cos(lon - hh.lon) + Math.sin(lat) * Math.sin(hh.lat), -1, 1)), front = k * 3.2;
      if (Math.abs(d - front) < 0.22) hit = Math.max(hit, 1 - k / 0.7);
      else if (d < front && d < 0.5) hit = Math.max(hit, 0.4 * (1 - k / 0.7));
    }
    return hit;
  };
  function dome(buf    , light    , far         ) {
    const [cx, cy] = centre(), GRID = 6.2;
    for (let y = Math.floor(cy - RAD - 1); y <= cy; y++)
      for (let x = Math.floor(cx - RAD - 1); x <= Math.ceil(cx + RAD + 1); x++) {
        const u = (x + 0.5 - cx) / RAD, v = (cy - y - 0.5) / RAD, q = u * u + v * v;
        if (q > 1 || v < 0) continue;
        const z = Math.sqrt(1 - q) * (far ? -1 : 1), lon = Math.atan2(u, z), lat = Math.asin(clamp(v, 0, 1));
        const [id, e] = cell(lon * GRID, lat * GRID * 1.15);
        const h = hash(id & 0xffff, id >>> 16), appear = 0.05 + (lat / (Math.PI / 2)) * 0.6 + h * 0.08, gone = GONE + h * 0.55;
        if (t < appear || t > gone) continue;
        const age = t - appear, end = gone - t, rim = 1 - Math.abs(z), hit = ripple(lon, lat);
        const flash = age < 0.1 || end < 0.08;
        const sweep = Math.abs(frac(lon * 0.35 + lat * 0.45 - t * 0.55) - 0.5) < 0.04;
        if (far) { if (e > 0.82 && bayer(x, y) < 0.5) buf.set(x, y, C[4] ); continue; }
        if (e > 0.8) {
          const c = flash || hit > 0.6 ? WHITE : hit > 0.2 || sweep || rim > 0.75 ? C[1]  : rim > 0.4 ? C[2]  : C[3] ;
          if (flash || hit > 0.2 || sweep || 0.5 + rim > bayer(x, y)) buf.set(x, y, c);
        } else {
          const a = (flash ? 0.7 : 0.08 + 0.3 * rim * rim) + hit * 0.6;
          if (a > bayer(x, y)) buf.set(x, y, flash || hit > 0.5 ? C[1]  : rim > 0.7 ? C[3]  : C[4] );
        }
        if (((x * 7 + y * 3) & 31) === 0) light.glow(x, y, 7, C[3] , 0.15 + 0.4 * hit);
      }
    const a = smooth(0, 0.15, t) * (1 - smooth(GONE - 0.05, GONE + 0.45, t));
    if (!far && a > 0) ringE(buf, cx, cy, RAD, 3, 1, C[2] , a, (ang) => Math.sin(ang) > 0);
    if (!far) light.glow(cx, cy - RAD * 0.5, RAD * 1.3, C[3] , 0.22 * a);
  }
  return {
    update(dt        ) {
      t += dt;
      if (t < 0.75)
        for (let i = 0; i < 3; i++) {
          const [x, y] = surf(R.range(-Math.PI / 2, Math.PI / 2), Math.min((t / 0.65) * (Math.PI / 2), 1.5));
          ps.spawn(K.STAR, x * PX, y * PX, R.range(-20, 20), R.range(-30, 10), R.range(0.2, 0.4), R.pick(SPARKS), R.range(0.6, 1.2));
        }
      for (const h of hits)
        if (t >= h.t && !h.done) {
          h.done = true;
          const [x, y] = surf(h.lon, h.lat);
          o.shake?.(0.18);
          lights.push({ x: x * PX, y: y * PX, r: 80, color: C[2] , k: 0.9, life: 0.18, max: 0.18 });
          ps.spawn(K.GLINT, x * PX, y * PX, 0, 0, 0.05, WHITE, 1.8);
          for (let j = 0; j < 14; j++) {
            const a = R.range(-1, 1) + (h.lat > 0.9 ? -0.6 : 0), sp = R.range(200, 600);
            ps.spawn(K.SPARK, x * PX, y * PX, Math.cos(a) * sp, Math.sin(a) * sp - 80, R.range(0.1, 0.35));
          }
        }
      if (t > GONE - 0.05 && t < GONE + 0.6)
        for (let i = 0; i < 4; i++) {
          const [x, y] = surf(R.range(-1.4, 1.4), R.range(0, 1.4));
          ps.spawn(R.chance(0.5) ? K.STAR : K.MOTE, x * PX, y * PX, R.range(-30, 30), -R.range(20, 80), R.range(0.3, 0.7), R.pick(SPARKS), R.range(0.6, 1.4));
        }
      ps.update(dt);
      stepLights(lights, dt);
    },
    draw(f       , layer        ) {
      const buf = new Px(f, f.color), light = new Px(f, f.light);
      if (layer !== "front") dome(buf, light, true);
      if (layer === "back") return;
      dome(buf, light, false);
      for (const h of hits) {
        const k = (h.t - t) / 0.12;
        if (!h.traced || k < 0 || k > 1) continue;
        const [x1, y1] = surf(h.lon, h.lat), x = x1 + 170 * k, y = y1 - 30 * k;
        seg(buf, x + 14, y - 2.5, x + 6, y - 1, TRACER_TAIL);
        seg(buf, x + 6, y - 1, x, y, TRACER);
        buf.set(Math.floor(x), Math.floor(y), TRACER_CORE);
        light.glow(x, y, 8, TRACER, 0.5);
      }
      ps.draw(buf, light);
      drawLights(light, lights);
    },
    hit(x        , y        ) {
      const [cx, cy] = centre();
      const lat = Math.asin(clamp((cy - y / PX) / RAD, 0, 1));
      hits.push({ t, lon: Math.asin(clamp((x / PX - cx) / RAD / Math.max(0.05, Math.cos(lat)), -1, 1)), lat, traced: false, done: false });
    },
    drop() { GONE = Math.min(GONE, t); },
    done: () => t > GONE + 0.6 && ps.list.length === 0,
  };
}
const HITS = [{ t: 1.05, lon: 0.75, lat: 0.55 }, { t: 1.38, lon: 1.05, lat: 0.95 }, { t: 1.62, lon: 0.5, lat: 0.25 }, { t: 2.05, lon: 0.9, lat: 1.2 },];
const TRACER = hex("#ffd65a"), TRACER_TAIL = hex("#ff8a2a"), TRACER_CORE = hex("#fffbe8");
function groundAt(g                                              , x        ) { return g === undefined ? Infinity : typeof g === "number" ? g : g(x); }
const PX = 2;
class Px {
  w        ; h        ; ox        ; oy        ; data             ;
  constructor(f       , data             ) { this.w = f.w; this.h = f.h; this.ox = f.ox; this.oy = f.oy; this.data = data; }
  at(x        , y        ) { x = (x - this.ox) | 0; y = (y - this.oy) | 0; return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x; }
  set(x        , y        , c        ) { const i = this.at(x, y); if (i >= 0) this.data[i] = c; }
  add(x        , y        , c        , k        ) {
    const i = this.at(x, y);
    if (i < 0) return;
    const d = this.data[i] , r = Math.min(255, (d & 255) + (c & 255) * k), g = Math.min(255, ((d >>> 8) & 255) + ((c >>> 8) & 255) * k), b = Math.min(255, ((d >>> 16) & 255) + ((c >>> 16) & 255) * k);
    this.data[i] = (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
  }
  disc(cx        , cy        , r        , c        ) {
    if (r <= 0.5) return this.set(Math.round(cx), Math.round(cy), c);
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const dy = y + 0.5 - cy;
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx; if (dx * dx + dy * dy <= r2) this.set(x, y, c); }
    }
  }
  line(x0        , y0        , x1        , y1        , c        ) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 4096; n++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) (err += dy), (x0 += sx);
      if (e2 <= dx) (err += dx), (y0 += sy);
    }
  }
  glow(cx        , cy        , r        , c        , k        ) {
    if (r < 1 || k <= 0.01) return;
    const x0 = Math.max(this.ox, Math.floor(cx - r)), x1 = Math.min(this.ox + this.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(this.oy, Math.floor(cy - r)), y1 = Math.min(this.oy + this.h - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / r;
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / r, d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const f = 1 - Math.sqrt(d);
        this.add(x, y, c, f * f * k);
      }
    }
  }
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayer(x        , y        ) { return (BAYER[((y & 3) << 2) | (x & 3)]  + 0.5) / 16; }
function rgb(r        , g        , b        , a = 255) { return ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255); }
function hex(h        ) { const v = parseInt(h.replace("#", ""), 16); return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255); }
function scale(c        , k        ) {
  return rgb(Math.min(255, (c & 255) * k), Math.min(255, ((c >>> 8) & 255) * k), Math.min(255, ((c >>> 16) & 255) * k), c >>> 24);
}
const WHITE = hex("#ffffff");
const HOT = hex("#fff3a6");
const YELLOW = hex("#ffe26b");
const ORANGE = hex("#ff8a2a");
const DEEP_ORANGE = hex("#f2561d");
const ICE = ["#ffffff", "#dcfbff", "#a6ecff", "#62c8f4", "#3a8bd8", "#2c58aa", "#212f6b", "#151a3d"].map(hex);
class Rng {
          s        ;
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a        , b        ) { return a + (b - a) * this.next(); }
  chance(p        ) { return this.next() < p; }
  pick   (a              )    { return a[Math.floor(this.next() * a.length)] ; }
}
const TAU = Math.PI * 2;
function clamp(v        , a = 0, b = 1) { return v < a ? a : v > b ? b : v; }
function smooth(a        , b        , x        ) { const t = (x - a) / (b - a); return x <= a ? 0 : x >= b ? 1 : t * t * (3 - 2 * t); }
function hash(n        , k = 0) { return ((Math.imul(n + 1 + k * 7919, 2654435761) >>> 0) % 100000) / 100000; }
function frac(x        ) { return x - Math.floor(x); }
const K = { STAR: 0, MOTE: 1, GLINT: 2, SPARK: 3 }         ;
                                    
                                                                                                                                      
class Particles {
  list      = [];
  t = 0;
  R     ;
  ground                       ;
  constructor(R     , ground                       ) { this.R = R; this.ground = ground; }
  spawn(k   , x        , y        , vx        , vy        , life        , col = 0, size = 1) {
    this.list.push({ k, x, y, vx, vy, life, max: life, col, size, seed: this.R.next() * 100 });
  }
  update(dt        ) {
    this.t += dt;
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i] ;
      if ((p.life -= dt) <= 0) { L.splice(i, 1); continue; }
      switch (p.k) {
        case K.STAR:
          p.vx -= p.vx * 1.6 * dt;
          p.vy -= p.vy * 1.6 * dt + 10 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case K.MOTE:
          p.vx -= p.vx * 0.6 * dt;
          p.vy -= p.vy * 0.6 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          break;
        case K.GLINT:
          break;
        case K.SPARK: {
          p.vy += 1900 * 0.45 * dt;
          p.vx -= p.vx * 2.2 * dt;
          p.vy -= p.vy * 2.2 * dt;
          const g = this.ground(p.x), ny = p.y + p.vy * dt;
          p.x += p.vx * dt;
          if (p.vy > 0 && p.y <= g && ny >= g) { p.vy = -p.vy * 0.45; p.vx *= 0.7; p.y = g - 0.5; } else p.y = ny;
          break;
        }
      }
    }
  }
  draw(buf    , light    ) { for (const p of this.list) this.drawOne(p, buf, light); }
          drawOne(p   , buf    , light    ) {
    const k = p.life / p.max, ax = p.x / PX, ay = p.y / PX, px = Math.floor(ax), py = Math.floor(ay);
    switch (p.k) {
      case K.STAR: {
        const tw = 0.6 + 0.4 * Math.sin(this.t * (8 + (p.seed % 5)) + p.seed);
        if (p.size < 1) { if (tw * k > 0.25) buf.set(px, py, tw > 0.8 ? WHITE : p.col); light.glow(ax, ay, 3, p.col, 0.4 * k * tw); break; }
        const arm = Math.max(1, Math.round(p.size * tw * Math.min(1, k * 3))), tip = scale(p.col, 0.75);
        for (let d = 1; d <= arm; d++) {
          const cc = d === arm && arm > 1 ? tip : p.col;
          buf.set(px + d, py, cc);
          buf.set(px - d, py, cc);
          buf.set(px, py + d, cc);
          buf.set(px, py - d, cc);
        }
        if (arm >= 3) for (let j = 0; j < 4; j++) buf.set(px + (j & 1 ? -1 : 1), py + (j & 2 ? -1 : 1), tip);
        buf.set(px, py, WHITE);
        light.glow(ax, ay, 3 + arm * 2, p.col, 0.5 * k * tw);
        break;
      }
      case K.MOTE: {
        const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, len = Math.min(16, 0.5 + sp * 0.013) * p.size;
        if (k < 0.35 && bayer(px, py) > k / 0.35) break;
        buf.line(ax - ux * len, ay - uy * len, ax - ux * len * 0.35, ay - uy * len * 0.35, scale(p.col, 0.55));
        buf.line(ax - ux * len * 0.4, ay - uy * len * 0.4, ax, ay, p.col);
        light.glow(ax, ay, 2.5 + p.size, p.col, 0.4 * k);
        break;
      }
      case K.GLINT: {
        const r = p.size * (0.5 + k * 0.5);
        buf.disc(ax, ay, r + 0.8, DEEP_ORANGE);
        buf.disc(ax, ay, r, p.col === WHITE ? HOT : p.col);
        light.glow(ax, ay, p.size * 4, p.col, 0.6 * k);
        break;
      }
      case K.SPARK: {
        const hot = k > 0.6 ? HOT : k > 0.3 ? YELLOW : ORANGE;
        const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, len = Math.min(9, 1 + sp * 0.011);
        buf.line(ax - ux * len, ay - uy * len, ax - ux * len * 0.4, ay - uy * len * 0.4, k > 0.5 ? hot : DEEP_ORANGE);
        buf.line(ax - ux * len * 0.45, ay - uy * len * 0.45, ax, ay, hot);
        light.glow(ax, ay, 3, hot, 0.45 * k);
        break;
      }
    }
  }
}
                                                                                                        
function stepLights(lights         , dt        ) { for (let i = lights.length - 1; i >= 0; i--) if ((lights[i] .life -= dt) <= 0) lights.splice(i, 1); }
function drawLights(light    , lights         ) {
  for (const l of lights) { const k = l.life / l.max; light.glow(l.x / PX, l.y / PX, (l.r / PX) * (0.55 + 0.45 * k), l.color, l.k * k * k); }
}
function dot(buf    , x        , y        , c        , a = 1) {
  const px = Math.floor(x), py = Math.floor(y);
  if (a >= 1 || a > bayer(px, py)) buf.set(px, py, c);
}
function seg(buf    , x0        , y0        , x1        , y1        , c        , a = 1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n; dot(buf, x, y, c, a); }
}
function ringE(buf    , cx        , cy        , rx        , ry        , thick        , c        , a = 1, keep                           ) {
  const n = Math.ceil(Math.max(rx, ry) * TAU * 1.3);
  for (let j = 0; j < n; j++) {
    const ang = (j / n) * TAU;
    if (keep && !keep(ang)) continue;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let o = -thick / 2; o <= thick / 2; o += 0.5) dot(buf, cx + ca * (rx + o), cy + sa * (ry + o * (ry / Math.max(1, rx))), c, a);
  }
}

window.SF_VFX.shield = shield;
})();
