'use strict';
/* ==========================================================================
   Motor básico: canvas, assets, entrada, helpers de desenho e interface
   ========================================================================== */
const W = 480, H = 272;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;
ctx.imageSmoothingEnabled = false;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const fmt = n => 'R$' + Math.round(n);
const QS = new URLSearchParams(location.search);

/* ------------------------------------------------------------------ assets */
const IMG = {};
const MANIFEST = {
  hero_idle: 'hero/Idle.png', hero_run: 'hero/Run.png', hero_jump: 'hero/Jump.png', hero_fall: 'hero/Fall.png',
  hero_hit: 'hero/Hit.png', hero_dj: 'hero/Double_Jump.png', hero_appear: 'hero/Appearing.png',
  e1_idle: 'enemies/e1_idle.png', e1_run: 'enemies/e1_run.png',
  e2_idle: 'enemies/e2_idle.png', e2_run: 'enemies/e2_run.png',
  e3_idle: 'enemies/e3_idle.png', e3_walk: 'enemies/e3_walk.png',
  e4_idle: 'enemies/e4_idle.png', e4_walk: 'enemies/e4_walk.png', ball: 'enemies/ball.png',
  e5_fly: 'enemies/e5_fly.png', mentor_idle: 'enemies/mentor_idle.png', mentor_run: 'enemies/mentor_run.png',
  gem1: 'objects/gem1.png', gem2: 'objects/gem2.png', gem3: 'objects/gem3.png',
  gem4: 'objects/gem4.png', gem5: 'objects/gem5.png', gem6: 'objects/gem6.png',
  flag: 'objects/Checkpoint_Flag_Idle1.png', pole: 'objects/Checkpoint_No_Flag.png',
  end_idle: 'objects/End_Idle.png', end_pressed: 'objects/End_Pressed.png',
  box1: 'objects/1_Idle.png', box2: 'objects/2_Idle.png', box3: 'objects/3_Idle.png',
  saw: 'traps/trap2.png', spikes: 'traps/trap4.png', electric: 'traps/trap6.png',
  bg1: 'tiles/bg1.png', bg2: 'tiles/bg2.png', bg3: 'tiles/bg3.png', bg4: 'tiles/bg4.png', bg5: 'tiles/bg5.png', bg6: 'tiles/bg6.png',
  tileset: 'tiles/tileset.png', gui: 'tiles/gui.png',
};
function loadAssets() {
  const jobs = Object.entries(MANIFEST).map(([k, src]) => new Promise(res => {
    const i = new Image();
    i.onload = () => { IMG[k] = i; res(); };
    i.onerror = () => { console.warn('asset ausente:', src); res(); };
    i.src = 'assets/' + src;
  }));
  const font = (document.fonts && document.fonts.load) ? document.fonts.load('8px Pixel').catch(() => { }) : Promise.resolve();
  return Promise.all([...jobs, font]);
}

/* sprite de folha horizontal: fw x fh por quadro */
function spr(key, fw, fh, f, x, y, flip = false, s = 1, alpha = 1) {
  const img = IMG[key]; if (!img) return;
  const n = Math.max(1, Math.floor(img.width / fw));
  f = ((Math.floor(f) % n) + n) % n;
  const dw = fw * s, dh = fh * s;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (flip) {
    ctx.save(); ctx.translate(Math.round(x + dw), Math.round(y)); ctx.scale(-1, 1);
    ctx.drawImage(img, f * fw, 0, fw, fh, 0, 0, dw, dh); ctx.restore();
  } else ctx.drawImage(img, f * fw, 0, fw, fh, Math.round(x), Math.round(y), dw, dh);
  if (alpha !== 1) ctx.globalAlpha = 1;
}
/* recorte com escala (retratos) */
function crop(key, sx, sy, sw, sh, x, y, s = 1, flip = false) {
  const img = IMG[key]; if (!img) return;
  if (flip) { ctx.save(); ctx.translate(x + sw * s, y); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw * s, sh * s); ctx.restore(); }
  else ctx.drawImage(img, sx, sy, sw, sh, x, y, sw * s, sh * s);
}

/* ------------------------------------------------------------------ entrada */
const keys = {}; let pressed = {}; let taps = [];
var G_lastInput = performance.now();
const BLOCK = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
addEventListener('keydown', e => {
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  if (BLOCK.includes(e.code)) e.preventDefault();
  G_lastInput = performance.now();
  if (typeof Sfx !== 'undefined') Sfx.resume();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const any = (...c) => c.some(k => keys[k]);
const anyP = (...c) => c.some(k => pressed[k]);
const inp = {
  left: () => any('ArrowLeft', 'KeyA'),
  right: () => any('ArrowRight', 'KeyD'),
  jumpHeld: () => any('Space', 'ArrowUp', 'KeyW'),
  jumpP: () => anyP('Space', 'ArrowUp', 'KeyW'),
  actP: () => anyP('KeyE', 'Enter', 'KeyJ'),
  okP: () => anyP('Enter', 'Space', 'KeyE'),
  lP: () => anyP('ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW'),
  rP: () => anyP('ArrowRight', 'KeyD', 'ArrowDown', 'KeyS'),
  upP: () => anyP('ArrowUp', 'KeyW'), downP: () => anyP('ArrowDown', 'KeyS'),
};

function toCanvas(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height };
}
canvas.addEventListener('pointerdown', ev => {
  G_lastInput = performance.now();
  if (typeof Sfx !== 'undefined') Sfx.resume();
  taps.push(toCanvas(ev));
});
canvas.addEventListener('pointermove', ev => { pointer = toCanvas(ev); });
let pointer = { x: -1, y: -1 };
function endInput() { pressed = {}; taps = []; }

/* controles de toque (HTML) */
(function touchControls() {
  const map = { btnLeft: 'ArrowLeft', btnRight: 'ArrowRight', btnJump: 'Space', btnAct: 'Enter' };
  for (const id in map) {
    const el = document.getElementById(id); if (!el) continue;
    const code = map[id];
    const down = e => { e.preventDefault(); if (!keys[code]) pressed[code] = true; keys[code] = true; G_lastInput = performance.now(); if (typeof Sfx !== 'undefined') Sfx.resume(); el.classList.add('on'); };
    const up = e => { e.preventDefault(); keys[code] = false; el.classList.remove('on'); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up); el.addEventListener('pointercancel', up);
  }
  if (QS.get('touch') === '1' || (window.matchMedia && matchMedia('(pointer:coarse)').matches)) document.body.classList.add('touch');
})();

/* ------------------------------------------------------------------ texto */
const FONT = s => `${s}px Pixel, "Courier New", monospace`;
function txt(s, x, y, color = '#fff', align = 'left', shadow = '#0b1a24') {
  ctx.textAlign = align; ctx.textBaseline = 'top';
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(s, x + 1, y + 1); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function wrap(s, maxW) {
  const out = [];
  for (const para of String(s).split('\n')) {
    const words = para.split(' '); let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    }
    out.push(cur);
  }
  return out;
}
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function frame(x, y, w, h, fill, border, th = 2) { rect(x, y, w, h, border); rect(x + th, y + th, w - th * 2, h - th * 2, fill); }

/* painel 9-slice a partir do tileset de GUI (moldura verde-azulada) */
function panel(x, y, w, h) {
  const g = IMG.gui; x = Math.round(x); y = Math.round(y);
  if (!g) { frame(x, y, w, h, '#0f5b70', '#12303b'); return; }
  const S = 16;
  const sx = [0, 16, 32], sw = [16, 16, 16];
  const dx = [x, x + S, x + w - S], dw = [S, w - 2 * S, S];
  const dy = [y, y + S, y + h - S], dh = [S, h - 2 * S, S];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++)
    ctx.drawImage(g, sx[i], sx[j], 16, 16, dx[i], dy[j], dw[i], dh[j]);
}
function bar(x, y, w, h, frac, color, bg = '#12303b') {
  rect(x - 1, y - 1, w + 2, h + 2, '#000'); rect(x, y, w, h, bg);
  rect(x, y, Math.round(w * clamp(frac, 0, 1)), h, color);
  rect(x, y, Math.round(w * clamp(frac, 0, 1)), 2, 'rgba(255,255,255,.35)');
}
function icon(name, x, y, s = 1) { // ícone 16x16 animado (moeda etc.)
  spr(name, 16, 16, 0, x, y, false, s);
}

/* ------------------------------------------------------------------ retratos */
function portrait(who, x, y, t) {
  rect(x, y, 64, 64, 'rgba(0,0,0,.35)');
  if (who === 'hero') spr('hero_idle', 32, 32, t / 5, x, y, false, 2);
  else if (who === 'mentor') crop('mentor_idle', Math.floor(t / 5) % 11 * 72 + 26, 18, 32, 30, x, y + 4, 2);
  else if (who === 'divida') crop('e1_idle', Math.floor(t / 5) % 11 * 48 + 8, 14, 32, 34, x, y, 2);
}
const NAMES = { mentor: 'Dona Poupança', hero: 'Você', divida: 'Sr. Dívida' };

/* ------------------------------------------------------------------ modais */
const UI = { modal: null, t: 0 };

function openDialog(lines, onClose) {
  UI.modal = { kind: 'dialog', lines, i: 0, chars: 0, onClose, lock: 8 };
}
function openChoice(o) {
  const first = o.options.findIndex(x => !x.disabled);
  UI.modal = { kind: 'choice', title: o.title, text: o.text, options: o.options, sel: Math.max(0, first), lock: 14, who: o.who };
}

function choiceLayout(m) {
  ctx.font = FONT(8);
  const pw = 420, inner = pw - 44;
  const tl = m.text ? wrap(m.text, inner) : [];
  let y = 0;
  const titleH = m.title ? 20 : 0;
  const textH = tl.length ? tl.length * 11 + 8 : 0;
  const opts = m.options.map(o => {
    const ll = wrap(o.label, inner - 20);
    const sl = o.sub ? wrap(o.sub, inner - 20) : [];
    const h = 12 + ll.length * 11 + (sl.length ? sl.length * 10 + 2 : 0);
    return { ll, sl, h };
  });
  const optsH = opts.reduce((a, o) => a + o.h + 5, 0);
  const ph = 26 + titleH + textH + optsH + 12;
  const px = (W - pw) / 2, py = Math.max(6, Math.round((H - ph) / 2));
  let cy = py + 20 + titleH + textH;
  const rects = opts.map(o => { const r = { x: px + 22, y: cy, w: inner, h: o.h, ...o }; cy += o.h + 5; return r; });
  return { px, py, pw, ph, tl, rects, titleY: py + 18, textY: py + 18 + titleH };
}

function updateModal() {
  const m = UI.modal; if (!m) return false;
  UI.t++;
  if (m.lock > 0) m.lock--;
  if (m.kind === 'dialog') {
    const full = m.lines[m.i][1];
    const before = Math.floor(m.chars);
    m.chars = Math.min(full.length, m.chars + 0.8);
    if (Math.floor(m.chars) !== before && Math.floor(m.chars) % 3 === 0) Sfx.play('type');
    let adv = inp.okP();
    for (const t of taps) adv = true;
    if (adv && m.lock <= 0) {
      if (m.chars < full.length) { m.chars = full.length; m.lock = 4; }
      else {
        m.i++; m.chars = 0; m.lock = 6;
        if (m.i >= m.lines.length) { UI.modal = null; if (m.onClose) m.onClose(); }
      }
    }
  } else {
    const L = choiceLayout(m);
    const n = m.options.length;
    const step = d => { let s = m.sel; for (let k = 0; k < n; k++) { s = (s + d + n) % n; if (!m.options[s].disabled) break; } if (s !== m.sel) { m.sel = s; Sfx.play('select'); } };
    if (inp.downP() || anyP('ArrowRight', 'KeyD')) step(1);
    if (inp.upP() || anyP('ArrowLeft', 'KeyA')) step(-1);
    // ponteiro: hover
    L.rects.forEach((r, i) => { if (!m.options[i].disabled && pointer.x >= r.x && pointer.x <= r.x + r.w && pointer.y >= r.y && pointer.y <= r.y + r.h && m.hover !== i) { m.hover = i; m.sel = i; } });
    let pick = -1;
    if (m.lock <= 0 && inp.okP()) pick = m.sel;
    for (const t of taps) L.rects.forEach((r, i) => { if (t.x >= r.x && t.x <= r.x + r.w && t.y >= r.y && t.y <= r.y + r.h && !m.options[i].disabled && m.lock <= 0) pick = i; });
    if (pick >= 0 && !m.options[pick].disabled) {
      const o = m.options[pick]; UI.modal = null; Sfx.play('ok'); if (o.fn) o.fn();
    }
  }
  return true;
}

function drawModal() {
  const m = UI.modal; if (!m) return;
  if (m.kind === 'dialog') {
    const [who, text] = m.lines[m.i];
    const x = 10, y = H - 92, w = W - 20, h = 84;
    panel(x, y, w, h);
    portrait(who, x + 14, y + 10, UI.t);
    ctx.font = FONT(8);
    txt(NAMES[who] || '', x + 90, y + 10, '#ffd23f');
    const shown = text.slice(0, Math.floor(m.chars));
    const lines = wrap(shown, w - 90 - 22);
    lines.forEach((l, i) => txt(l, x + 90, y + 26 + i * 11, '#fff4d6'));
    if (m.chars >= text.length && UI.t % 40 < 24) { rect(x + w - 24, y + h - 20, 8, 2, '#ffd23f'); rect(x + w - 22, y + h - 18, 4, 2, '#ffd23f'); }
  } else {
    const L = choiceLayout(m);
    rect(0, 0, W, H, 'rgba(6,14,22,.55)');
    panel(L.px, L.py, L.pw, L.ph);
    ctx.font = FONT(8);
    if (m.title) txt(m.title, W / 2, L.titleY, '#ffd23f', 'center');
    L.tl.forEach((l, i) => txt(l, L.px + 22, L.textY + i * 11, '#fff4d6'));
    L.rects.forEach((r, i) => {
      const o = m.options[i], sel = i === m.sel;
      const fill = o.disabled ? '#37474f' : sel ? '#ffd23f' : '#1f8a86';
      const brd = sel ? '#fff4d6' : '#0b3b44';
      frame(r.x, r.y, r.w, r.h, fill, brd);
      const tc = o.disabled ? '#8a9aa2' : sel ? '#2b1b00' : '#ffffff';
      r.ll.forEach((l, k) => txt(l, r.x + 10, r.y + 6 + k * 11, tc, 'left', sel && !o.disabled ? null : '#0b1a24'));
      r.sl.forEach((l, k) => txt(l, r.x + 10, r.y + 6 + r.ll.length * 11 + 2 + k * 10, o.disabled ? '#8a9aa2' : sel ? '#5a3b00' : '#c9f5e6', 'left', null));
    });
  }
}
