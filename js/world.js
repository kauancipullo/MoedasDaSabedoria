'use strict';
/* ==========================================================================
   Mundo de jogo: física, entidades, regras de dinheiro e desenho das fases
   ========================================================================== */
var RUN = null;      // estado da partida (dinheiro, poupança, dívida, felicidade...)
var PS = null;       // estatísticas da fase atual
const PW = 12, PH = 24;
const STAR_COST = 15, COIN_VALUE = 5;
const THEME_ORIGIN = [[0, 0], [96, 0], [192, 0], [0, 64], [96, 64], [192, 64]];

/* -------------------------------------------------------------- estado geral */
function newRun() {
  return {
    phase: 0, wallet: 30, savings: 0, debt: 0, happy: 60, parcelas: 0, coinMult: 1, shield: 0,
    choices: {}, dream: null, quizOk: 0, quizDone: 0, tookCredit: 0, peakDebt: 0, totalSaved: 0,
  };
}
function newPS() {
  return {
    coins: 0, coinMoney: 0, lazer: 0, saved: 0, needs: 0, needsSpent: 0, overdraft: 0, wants: [], wantSpent: 0,
    installments: 0, creditTotal: 0, stomps: 0, hits: 0, lost: 0, interest: 0, debtGrowth: 0, path: null, riskResult: 0,
    usedSavings: 0, cashBuys: 0,
  };
}
const happy = n => { RUN.happy = clamp(RUN.happy + n, 0, 100); };
function takeMoney(n, { debtOk = false } = {}) {          // tira da carteira, depois da poupança
  let left = n, fromW = Math.min(RUN.wallet, left); RUN.wallet -= fromW; left -= fromW;
  const fromS = Math.min(RUN.savings, left); RUN.savings -= fromS; left -= fromS;
  if (left > 0 && debtOk) RUN.debt += left;
  return { fromW, fromS, short: left };
}

/* -------------------------------------------------------------- construção */
function makeWorld(idx) {
  const def = LEVEL_DEFS[idx], b = def.build();
  const w = {
    idx, def, cols: b.cols, rows: ROWS, tiles: b.tiles, ents: [], crates: [], parts: [], floats: [], time: 0,
    spawn: b.start_, check: { x: b.start_.x, y: b.start_.y }, cam: { x: 0 }, done: false, doneT: 0, failed: false,
    banner: null, pending: [], extraSpots: [], p: null, dispW: RUN.wallet, dispS: RUN.savings, dispH: RUN.happy, dispD: RUN.debt, shake: 0,
  };
  for (const e of b.ents) {
    const cx = e.x + 8, top = e.y - 16;
    switch (e.t) {
      case 'coin': w.ents.push({ t: 'coin', x: cx, y: e.y - 8, alive: true, ph: Math.random() * 6 }); break;
      case 'star': w.ents.push({ t: 'star', x: cx, y: e.y - 8, alive: true, cool: 0 }); break;
      case 'want': w.ents.push({ ...e, t: 'want', x: cx, y: e.y - 10, alive: true, cool: 0 }); break;
      case 'crate': w.crates.push({ x: e.x, y: e.y - 32, w: 32, h: 32, name: e.name, price: e.price, box: e.box, paid: false }); break;
      case 'bank': w.ents.push({ t: 'bank', x: cx, y: e.y, active: false }); break;
      case 'mentor': w.ents.push({ t: 'mentor', x: cx, y: e.y, seen: false, face: 1 }); break;
      case 'walker': w.ents.push(mkWalker(e.type, e.x + 1, e.y, e.min, e.max, 1)); break;
      case 'boss': if (RUN.debt > 0) { const s = clamp(1 + RUN.debt / 140, 1, 2.6); const bo = mkWalker('boss', e.x, e.y, e.min, e.max, s); w.ents.push(bo); } break;
      case 'cannon': w.ents.push({ t: 'cannon', type: 'cannon', x: cx - 10, y: e.y - 26, w: 20, h: 26, dir: e.dir, cd: 90, alive: true, dead: 0, anim: 0 }); break;
      case 'flyer': w.ents.push({ t: 'flyer', type: 'flyer', x: e.x, y: e.y - 26, baseY: e.y - 26, w: 20, h: 20, min: e.min, max: e.max, dir: 1, ph: Math.random() * 6, alive: true, dead: 0, anim: 0 }); break;
      case 'saw': w.ents.push({ t: 'saw', type: 'saw', x: cx, y: e.y - 14, min: e.min + 8, max: e.max - 8, dir: 1, anim: 0 }); break;
      case 'spikes': w.ents.push({ t: 'spikes', type: 'spikes', x: cx, y: e.y, anim: Math.floor(Math.random() * 7) }); break;
      case 'electric': w.ents.push({ t: 'electric', type: 'electric', x: cx, y: e.y, ph: 0 }); break;
      case 'chest': w.ents.push({ t: 'chest', x: cx, y: e.y, kind: e.kind, opened: false }); break;
      case 'sign': w.ents.push({ t: 'sign', x: cx, y: e.y, text: e.text }); break;
      case 'finish': w.ents.push({ t: 'finish', x: cx, y: e.y }); break;
      case 'extraSpot': w.extraSpots.push({ x: e.x, y: e.y }); break;
    }
  }
  // inimigos extras gerados por compras parceladas anteriores
  if (idx >= 3 && RUN.parcelas > 0) {
    const n = Math.min(w.extraSpots.length, RUN.parcelas * 2);
    for (let i = 0; i < n; i++) { const s = w.extraSpots[i]; w.ents.push(mkWalker('parcela', s.x, s.y, s.x - 64, s.x + 96, 1)); }
    w.extraNote = n;
  }
  w.tileCanvas = renderTiles(w);
  const p = { x: w.spawn.x + 2, y: w.spawn.y - PH, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, jbuf: 0, jumps: 0, inv: 0, hurtT: 0, turbo: 0, spawn: 42, t: 0, anim: 'idle' };
  w.p = p;
  return w;
}
function mkWalker(type, x, feet, min, max, s) {
  const d = { parcela: [18, 26, 0.55], conta: [18, 26, 0.5], juros: [20, 26, 0.8], boss: [18, 28, 0.5] }[type];
  const ww = d[0] * s, hh = d[1] * s;
  return { t: 'walker', type, x, y: feet - hh, w: ww, h: hh, speed: d[2], dir: -1, min: min ?? x - 64, max: max ?? x + 64, alive: true, dead: 0, anim: Math.floor(Math.random() * 10), s, chase: false };
}
function renderTiles(w) {
  const c = document.createElement('canvas'); c.width = w.cols * TS; c.height = ROWS * TS;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const [ox, oy] = THEME_ORIGIN[w.def.theme];
  const solid = (x, y) => (x < 0 || x >= w.cols || y < 0 || y >= ROWS) ? true : w.tiles[y][x] === 1;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < w.cols; x++) {
    if (w.tiles[y][x] !== 1) continue;
    const col = !solid(x - 1, y) ? 0 : !solid(x + 1, y) ? 2 : 1;
    const row = !solid(x, y - 1) ? 0 : !solid(x, y + 1) ? 2 : 1;
    if (IMG.tileset) g.drawImage(IMG.tileset, ox + col * 16, oy + row * 16, 16, 16, x * TS, y * TS, 16, 16);
    else { g.fillStyle = '#6b4'; g.fillRect(x * TS, y * TS, 16, 16); }
  }
  return c;
}

/* -------------------------------------------------------------- colisão */
function solidTile(w, tx, ty) { if (tx < 0 || tx >= w.cols) return true; if (ty < 0) return false; if (ty >= ROWS) return false; return w.tiles[ty][tx] === 1; }
function solidPx(w, px, py) { return solidTile(w, Math.floor(px / TS), Math.floor(py / TS)); }
function tileHit(w, x, y, ww, hh) {
  const x0 = Math.floor(x / TS), x1 = Math.floor((x + ww - 0.001) / TS), y0 = Math.floor(y / TS), y1 = Math.floor((y + hh - 0.001) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidTile(w, tx, ty)) return true;
  return false;
}
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function crateAt(w, r) { for (const c of w.crates) if (!c.paid && ov(r, c)) return c; return null; }
function groundY(w, x, fromY) {
  const tx = Math.floor(x / TS);
  for (let ty = Math.max(0, Math.floor(fromY / TS)); ty < ROWS; ty++) if (solidTile(w, tx, ty) && !solidTile(w, tx, ty - 1)) return ty * TS;
  return null;
}

function movePlayer(w, p) {
  p.x += p.vx;
  if (tileHit(w, p.x, p.y, PW, PH)) {
    if (p.vx > 0) p.x = Math.floor((p.x + PW) / TS) * TS - PW - 0.001; else if (p.vx < 0) p.x = Math.floor(p.x / TS) * TS + TS + 0.001;
    p.vx = 0;
  }
  let c = crateAt(w, { x: p.x, y: p.y, w: PW, h: PH });
  if (c) { p.x = p.vx >= 0 ? c.x - PW - 0.001 : c.x + c.w + 0.001; p.vx = 0; }
  p.y += p.vy; p.ground = false;
  if (tileHit(w, p.x, p.y, PW, PH)) {
    if (p.vy > 0) { p.y = Math.floor((p.y + PH) / TS) * TS - PH - 0.001; p.ground = true; }
    else if (p.vy < 0) p.y = Math.floor(p.y / TS) * TS + TS + 0.001;
    p.vy = 0;
  }
  c = crateAt(w, { x: p.x, y: p.y, w: PW, h: PH });
  if (c) { if (p.vy > 0) { p.y = c.y - PH - 0.001; p.ground = true; } else { p.y = c.y + c.h + 0.001; } p.vy = 0; }
  p.x = clamp(p.x, 0.01, w.cols * TS - PW - 0.01);
}

/* -------------------------------------------------------------- efeitos */
function burst(w, x, y, n, cols, sp = 2) {
  for (let i = 0; i < n; i++) w.parts.push({ x, y, vx: rnd(-sp, sp), vy: rnd(-sp * 1.4, sp * 0.4), life: rnd(20, 45), c: cols[i % cols.length], s: Math.random() < .5 ? 2 : 3, g: 0.12 });
}
function floatText(w, x, y, text, color = '#fff') { w.floats.push({ x, y, text, color, life: 75 }); }
function banner(w, text, color = '#ffd23f', sub = '') { w.banner = { text, color, sub, t: 0 }; }

function respawn(w, note) {
  const p = w.p; p.x = w.check.x + 2; p.y = w.check.y - PH - 1; p.vx = p.vy = 0; p.inv = 100; p.hurtT = 0;
}
function hurtPlayer(w, srcX, cost = 15) {
  const p = w.p; if (p.inv > 0 || w.done) return;
  PS.hits++;
  if (RUN.shield > 0) {
    RUN.shield--; floatText(w, p.x + 6, p.y - 8, 'Reserva protegeu!', '#7dffb0'); Sfx.play('ok');
    banner(w, 'Reserva de emergência usada!', '#7dffb0', RUN.shield > 0 ? `Ainda restam ${RUN.shield} proteção(ões)` : 'Ela acabou. Refaça sua reserva!');
  } else {
    const lost = Math.min(RUN.wallet, cost); RUN.wallet -= lost; PS.lost += lost;
    if (lost > 0) { floatText(w, p.x + 6, p.y - 8, '-' + fmt(lost), '#ff6b6b'); for (let i = 0; i < Math.min(6, lost / 3); i++) w.parts.push({ x: p.x + 6, y: p.y + 6, vx: rnd(-2, 2), vy: rnd(-4, -1), life: 50, c: '#ffd23f', s: 3, g: 0.2 }); }
    if (lost < cost * 0.5) happy(-6);
    Sfx.play('hurt');
  }
  happy(-2);
  p.vx = (p.x + PW / 2 < srcX ? -1 : 1) * 2.4; p.vy = -3.6; p.hurtT = 20; p.inv = 100; p.ground = false; w.shake = 8;
}

/* -------------------------------------------------------------- ações de dinheiro */
function bankDialog(w, e) {
  if (RUN.wallet < 5) { floatText(w, e.x, e.y - 60, 'Sem moedas para guardar!', '#ffd23f'); return; }
  const wal = Math.floor(RUN.wallet);
  const half = Math.floor(wal / 2 / 5) * 5;
  openChoice({
    title: 'COFRINHO / POUPANÇA',
    text: `Carteira: ${fmt(RUN.wallet)}   Poupança: ${fmt(RUN.savings)}\nA poupança rende +8% ao fim de cada fase e os juros também rendem (juros compostos!).`,
    options: [
      { label: `Guardar tudo (${fmt(wal)})`, sub: 'Dinheiro trabalhando por você', fn: () => deposit(w, wal) },
      { label: `Guardar metade (${fmt(half)})`, sub: 'Equilíbrio entre guardar e usar', disabled: half < 5, fn: () => deposit(w, half) },
      { label: 'Ficar com tudo na carteira', sub: 'Mais liberdade agora, sem juros', fn: () => { } },
    ],
  });
}
function deposit(w, n) {
  RUN.wallet -= n; RUN.savings += n; PS.saved += n; RUN.totalSaved += n;
  Sfx.play('deposit'); floatText(w, w.p.x + 6, w.p.y - 10, '+' + fmt(n) + ' guardados', '#7dffb0'); happy(2);
}
function payNeed(w, c) {
  const r = takeMoney(c.price, { debtOk: true });
  c.paid = true; PS.needs++; PS.needsSpent += c.price; PS.usedSavings += r.fromS;
  burst(w, c.x + 16, c.y + 16, 14, ['#c98a4a', '#e3b070', '#7b4a24']); Sfx.play('pay');
  floatText(w, c.x + 16, c.y - 20, `${c.name} -${fmt(c.price)}`, '#ffd23f');
  if (r.fromS > 0) floatText(w, c.x + 16, c.y - 34, 'Usou a poupança!', '#ff9f6b');
  if (r.short > 0) { PS.overdraft += r.short; happy(-10); banner(w, 'Você ficou no vermelho!', '#ff6b6b', 'Faltou dinheiro: a conta virou dívida.'); }
}
function buyWant(w, e, mode) {
  e.alive = false; PS.wants.push(e.name); happy(e.happy); PS.cashBuys++;
  burst(w, e.x, e.y, 18, ['#ff8de0', '#fff', '#ffd23f']); Sfx.play('buy');
  floatText(w, e.x, e.y - 24, `${e.name}!  +felicidade`, '#ff8de0');
}
function creditChoice(w, e) {
  const price = e.price, total = Math.round(price * 1.3), parc = Math.round(total / 10);
  const avail = RUN.wallet + RUN.savings;
  openChoice({
    title: `OFERTA: ${e.name.toUpperCase()}`,
    text: `Preço à vista: ${fmt(price)}.  Você tem ${fmt(avail)} (carteira + poupança).\nA loja oferece parcelamento em 10x de ${fmt(parc)}... mas o total vira ${fmt(total)}!`,
    options: [
      { label: `Pagar à vista (${fmt(price)})`, sub: avail >= price ? 'Sem juros, sem dívida' : 'Você não tem dinheiro suficiente', disabled: avail < price,
        fn: () => { const r = takeMoney(price); PS.wantSpent += price; if (r.fromS > 0) PS.usedSavings += r.fromS; buyWant(w, e); } },
      { label: `Parcelar em 10x de ${fmt(parc)} (total ${fmt(total)})`, sub: `+${fmt(total - price)} de juros. Vira dívida e gera inimigos!`,
        fn: () => { RUN.debt += total; RUN.tookCredit++; RUN.parcelas++; PS.installments++; PS.creditTotal += total; PS.wantSpent += total; RUN.peakDebt = Math.max(RUN.peakDebt, RUN.debt);
          buyWant(w, e); w.pending.push({ at: w.time + 50, n: 2 }); banner(w, 'Compra parcelada!', '#ff6b6b', 'As parcelas vêm te cobrar...'); } },
      { label: 'Deixar pra lá', sub: 'Resistir ao impulso também é uma escolha!', fn: () => { e.cool = 240; happy(3); floatText(w, w.p.x, w.p.y - 12, 'Autocontrole! +felicidade', '#7dffb0'); } },
    ],
  });
}
function chestResult(w, e) {
  e.opened = true; PS.path = e.kind; RUN.choices.path = e.kind;
  if (e.kind === 'safe') {
    RUN.wallet += 30; PS.riskResult = 30; happy(5); Sfx.play('deposit');
    burst(w, e.x, e.y - 16, 16, ['#7dffb0', '#ffd23f', '#fff']);
    openDialog([['mentor', 'Caminho seguro! Seu dinheiro rendeu +R$30, garantidos. Pouco, mas sem susto.'], ['mentor', 'Investimentos seguros rendem menos, porém protegem seu patrimônio.']]);
  } else {
    const win = Math.random() < 0.6;
    if (win) {
      RUN.wallet += 110; PS.riskResult = 110; happy(12); Sfx.play('win'); burst(w, e.x, e.y - 16, 30, ['#ffd23f', '#fff', '#ff8de0']); RUN.choices.risk = 'win';
      openDialog([['mentor', 'Deu certo! O investimento arriscado rendeu +R$110!'], ['mentor', 'Mas lembre-se: poderia ter dado prejuízo. Ninguém garante lucro no risco.']]);
    } else {
      const r = takeMoney(55); PS.riskResult = -(r.fromW + r.fromS); happy(-10); Sfx.play('bad'); w.shake = 12; RUN.choices.risk = 'loss';
      openDialog([['mentor', 'Ai! O investimento deu prejuízo e você perdeu ' + fmt(r.fromW + r.fromS) + '.'], ['mentor', 'Risco é isso: pode dar ganho, mas também perda. Só invista o que você pode arriscar!']]);
    }
  }
}

/* -------------------------------------------------------------- atualização */
function updateWorld(w) {
  const p = w.p; w.time++;
  // valores exibidos no HUD
  w.dispW += (RUN.wallet - w.dispW) * 0.2; w.dispS += (RUN.savings - w.dispS) * 0.2; w.dispH += (RUN.happy - w.dispH) * 0.15; w.dispD += (RUN.debt - w.dispD) * 0.2;
  if (w.shake > 0) w.shake--;
  if (w.banner) { w.banner.t++; if (w.banner.t > 170) w.banner = null; }
  for (const f of w.floats) { f.y -= 0.35; f.life--; } w.floats = w.floats.filter(f => f.life > 0);
  for (const q of w.parts) { q.x += q.vx; q.y += q.vy; q.vy += q.g; q.life--; } w.parts = w.parts.filter(q => q.life > 0);

  if (w.done) { w.doneT++; p.vx *= 0.8; return; }
  if (p.spawn > 0) { p.spawn--; updateEnts(w); camera(w); return; }

  /* ---- entrada e física do jogador ---- */
  const turbo = p.turbo > 0;
  const maxV = turbo ? 2.9 : 2.1, acc = 0.3, fr = 0.25;
  p.t++;
  if (p.hurtT > 0) p.hurtT--;
  else {
    if (inp.left() && !inp.right()) { p.vx = Math.max(-maxV, p.vx - acc); p.face = -1; }
    else if (inp.right() && !inp.left()) { p.vx = Math.min(maxV, p.vx + acc); p.face = 1; }
    else p.vx = Math.abs(p.vx) < fr ? 0 : p.vx - Math.sign(p.vx) * fr;
  }
  if (p.ground) { p.coyote = 7; p.jumps = 0; } else if (p.coyote > 0) p.coyote--;
  if (p.jbuf > 0) p.jbuf--;
  if (inp.jumpP() && p.hurtT <= 0) {
    if (p.coyote > 0) { p.vy = turbo ? -7.2 : -6.6; p.coyote = 0; p.jumps = 1; p.ground = false; Sfx.play('jump'); }
    else if (p.jumps < 2) { p.vy = turbo ? -6.2 : -5.7; p.jumps = 2; Sfx.play('djump'); burst(w, p.x + 6, p.y + 24, 5, ['#fff', '#cfe']); }
    else p.jbuf = 7;
  }
  if (p.jbuf > 0 && p.ground) { p.vy = -6.6; p.jumps = 1; p.jbuf = 0; p.ground = false; Sfx.play('jump'); }
  p.vy += (p.vy < 0 && !inp.jumpHeld()) ? 0.62 : 0.36;
  p.vy = Math.min(p.vy, 7.5);
  movePlayer(w, p);
  if (p.inv > 0) p.inv--;
  if (p.turbo > 0) { p.turbo--; if (w.time % 3 === 0) w.parts.push({ x: p.x + 6 + rnd(-4, 4), y: p.y + 20, vx: -p.face * 0.6, vy: rnd(-0.6, 0), life: 22, c: '#ffd23f', s: 2, g: 0 }); }
  if (p.y > ROWS * TS + 30) {
    PS.lost += Math.min(RUN.wallet, 10); const l = Math.min(RUN.wallet, 10); RUN.wallet -= l;
    floatText(w, p.x, ROWS * TS - 30, l > 0 ? 'Queda! -' + fmt(l) : 'Queda!', '#ff6b6b'); Sfx.play('hurt'); happy(-3); respawn(w);
  }
  // felicidade cai com o tempo
  if (w.time % 170 === 0) happy(-1);
  if (RUN.happy <= 0 && !w.failed) { w.failed = true; }

  updateEnts(w);
  camera(w);
}
function camera(w) {
  const tx = clamp(w.p.x + PW / 2 - W / 2 + w.p.face * 24, 0, w.cols * TS - W);
  w.cam.x += (tx - w.cam.x) * 0.12;
}

function updateEnts(w) {
  const p = w.p, pr = { x: p.x, y: p.y, w: PW, h: PH }, pcx = p.x + PW / 2, pcy = p.y + PH / 2;
  const act = inp.actP();
  // spawns pendentes (parcelas cobrando)
  for (const s of w.pending.slice()) if (w.time >= s.at) {
    w.pending.splice(w.pending.indexOf(s), 1);
    for (let i = 0; i < s.n; i++) {
      const x = pcx + (i ? 150 : -150), gy = groundY(w, x, p.y - 40);
      if (gy != null) { const e = mkWalker('parcela', x, gy, 0, 0, 1); e.chase = true; e.speed = 0.6; w.ents.push(e); burst(w, x, gy - 14, 10, ['#ff6b6b', '#fff']); }
    }
  }
  // caixas de necessidades
  for (const c of w.crates) if (!c.paid && ov({ x: pr.x - 3, y: pr.y, w: PW + 6, h: PH }, c) && p.spawn <= 0) payNeed(w, c);

  for (const e of w.ents) {
    switch (e.t) {
      case 'coin': {
        if (!e.alive) break;
        if (Math.hypot(pcx - e.x, pcy - e.y) < 14) { e.alive = false; const v = Math.round(COIN_VALUE * RUN.coinMult); RUN.wallet += v; PS.coins++; PS.coinMoney += v; Sfx.play('coin'); burst(w, e.x, e.y, 4, ['#ffd23f', '#fff']); happy(0.15); }
        break;
      }
      case 'star': {
        if (!e.alive) break; if (e.cool > 0) e.cool--;
        if (Math.hypot(pcx - e.x, pcy - e.y) < 18 && e.cool <= 0) {
          if (RUN.wallet >= STAR_COST) {
            RUN.wallet -= STAR_COST; PS.lazer += STAR_COST; e.alive = false; happy(14); p.turbo = 420; Sfx.play('star');
            burst(w, e.x, e.y, 16, ['#ffd23f', '#fff', '#ff8de0']); floatText(w, e.x, e.y - 20, `Lazer! -${fmt(STAR_COST)} +felicidade`, '#ffd23f');
          } else { e.cool = 90; floatText(w, e.x, e.y - 20, `Lazer custa ${fmt(STAR_COST)}`, '#ff9f6b'); }
        }
        break;
      }
      case 'want': {
        if (!e.alive) break; if (e.cool > 0) e.cool--;
        if (Math.hypot(pcx - e.x, pcy - e.y) < 20 && e.cool <= 0 && p.spawn <= 0) {
          if (e.credit) { e.cool = 200; creditChoice(w, e); }
          else if (RUN.wallet >= e.price) { RUN.wallet -= e.price; PS.wantSpent += e.price; buyWant(w, e); }
          else { e.cool = 100; floatText(w, e.x, e.y - 26, `Faltam ${fmt(e.price - RUN.wallet)}`, '#ff9f6b'); Sfx.play('bad'); }
        }
        break;
      }
      case 'bank': {
        const near = Math.abs(pcx - e.x) < 22 && Math.abs(p.y + PH - e.y) < 30;
        e.near = near;
        if (near && !e.active) { e.active = true; w.check = { x: e.x - 6, y: e.y }; Sfx.play('checkpoint'); banner(w, 'Cofrinho! Ponto de retorno salvo', '#7dffb0'); if (RUN.wallet >= 5) bankDialog(w, e); }
        else if (near && act) bankDialog(w, e);
        break;
      }
      case 'mentor': {
        const near = Math.abs(pcx - e.x) < 36 && Math.abs(p.y + PH - e.y) < 30; e.near = near; e.face = pcx > e.x ? 1 : -1;
        if (near && (!e.seen || act)) { e.seen = true; const h = w.def.hint; openDialog(h.map(t => ['mentor', t])); }
        break;
      }
      case 'walker': updWalker(w, e, pr); break;
      case 'cannon': updCannon(w, e, pr, pcx, pcy); break;
      case 'flyer': {
        e.anim++; e.ph += 0.05; e.x += e.dir * 0.7; if (e.x < e.min) e.dir = 1; if (e.x + e.w > e.max) e.dir = -1;
        e.y = e.baseY + Math.sin(e.ph) * 16;
        if (ov(pr, e)) hurtPlayer(w, e.x + 10, 15);
        break;
      }
      case 'ball': {
        e.x += e.vx; e.life--; e.anim++;
        if (solidPx(w, e.x + e.vx * 3, e.y) || e.life <= 0) { e.alive = false; burst(w, e.x, e.y, 5, ['#888', '#444']); }
        else if (Math.hypot(pcx - e.x, pcy - e.y) < 10) { e.alive = false; hurtPlayer(w, e.x, 15); }
        break;
      }
      case 'saw': {
        e.anim++;
        if (e.max > e.min) { e.x += e.dir * 0.9; if (e.x < e.min) e.dir = 1; if (e.x > e.max) e.dir = -1; }
        if (Math.hypot(pcx - e.x, pcy - e.y) < 20) hurtPlayer(w, e.x, 20);
        break;
      }
      case 'spikes': {
        e.anim += 0.12; const f = Math.floor(e.anim) % 7;
        if (f >= 1 && f <= 5 && ov(pr, { x: e.x - 6, y: e.y - 11, w: 12, h: 11 })) hurtPlayer(w, e.x, 15);
        break;
      }
      case 'electric': {
        e.ph = (e.ph + 1) % 170; e.on = e.ph > 90;
        if (e.on && ov(pr, { x: e.x - 10, y: e.y - 34, w: 20, h: 34 })) hurtPlayer(w, e.x, 20);
        break;
      }
      case 'chest': {
        if (!e.opened && Math.hypot(pcx - e.x, pcy - (e.y - 12)) < 24) chestResult(w, e);
        break;
      }
      case 'finish': {
        if (!w.done && ov(pr, { x: e.x - 18, y: e.y - 50, w: 36, h: 50 })) { w.done = true; w.doneT = 0; Sfx.stopMusic(); Sfx.play('win'); burst(w, e.x, e.y - 30, 40, ['#ffd23f', '#fff', '#ff8de0', '#7dffb0'], 3); banner(w, 'FASE COMPLETA!', '#ffd23f'); }
        break;
      }
    }
  }
  w.ents = w.ents.filter(e => e.t !== 'ball' || e.alive);
}

function updWalker(w, e, pr) {
  if (!e.alive) { e.dead--; return; }
  e.anim++;
  const p = w.p;
  let dir = e.dir;
  if (e.chase) { const dx = (p.x + 6) - (e.x + e.w / 2); dir = Math.abs(dx) < 4 ? 0 : Math.sign(dx); if (dir) e.dir = dir; }
  if (dir !== 0) {
    const nx = e.x + dir * e.speed, ax = dir > 0 ? nx + e.w : nx;
    const wall = solidPx(w, ax, e.y + e.h - 3) || solidPx(w, ax, e.y + 3);
    const ledge = !solidPx(w, ax, e.y + e.h + 3);
    const out = !e.chase && (nx < e.min || nx + e.w > e.max);
    if (wall || ledge || out) { if (!e.chase) e.dir = -e.dir; } else e.x = nx;
  }
  if (p.spawn <= 0 && ov(pr, e)) {
    const stomp = e.type !== 'boss' && p.vy > 0.6 && (p.y + PH) - e.y < 14;
    if (stomp) {
      e.alive = false; e.dead = 30; p.vy = -5.2; p.jumps = 1; PS.stomps++; Sfx.play('stomp'); burst(w, e.x + e.w / 2, e.y + e.h / 2, 10, ['#fff', '#ffd23f']);
      if (e.type === 'parcela' && RUN.debt > 0) { const q = Math.min(RUN.debt, 15); RUN.debt -= q; floatText(w, e.x, e.y - 10, 'Parcela quitada! -' + fmt(q) + ' de dívida', '#7dffb0'); }
      else { RUN.wallet += 5; floatText(w, e.x, e.y - 10, '+R$5', '#ffd23f'); }
    } else hurtPlayer(w, e.x + e.w / 2, e.type === 'boss' ? 25 : 15);
  }
}
function updCannon(w, e, pr, pcx, pcy) {
  if (!e.alive) { e.dead--; return; }
  e.anim++; e.cd--;
  const dx = (pcx - (e.x + 10)) * e.dir;
  if (e.cd <= 0 && dx > 0 && dx < 240 && Math.abs(pcy - (e.y + 14)) < 46) {
    e.cd = 150; Sfx.play('cannon'); e.fire = 12;
    w.ents.push({ t: 'ball', x: e.x + 10 + e.dir * 14, y: e.y + 12, vx: e.dir * 1.6, life: 260, alive: true, anim: 0 });
  }
  if (e.fire > 0) e.fire--;
  if (w.p.spawn <= 0 && ov(pr, e)) {
    if (w.p.vy > 0.6 && (w.p.y + PH) - e.y < 14) { e.alive = false; e.dead = 30; w.p.vy = -5.2; w.p.jumps = 1; PS.stomps++; RUN.wallet += 10; Sfx.play('stomp'); floatText(w, e.x, e.y - 10, 'Cartão bloqueado! +R$10', '#ffd23f'); burst(w, e.x + 10, e.y + 12, 12, ['#fff', '#aaa']); }
    else hurtPlayer(w, e.x + 10, 15);
  }
}

/* -------------------------------------------------------------- desenho */
const LABELS = { parcela: 'PARCELA', conta: 'CONTA SURPRESA', juros: 'JUROS', cannon: 'CARTÃO', flyer: 'COBRANÇA', saw: 'CHEQUE ESPECIAL', boss: 'SR. DÍVIDA', spikes: 'TAXAS', electric: 'MULTA' };
function label(text, x, y, color = '#fff') { ctx.font = FONT(8); txt(text, Math.round(x), Math.round(y), color, 'center'); }

function drawWorld(w) {
  const cx = Math.round(w.cam.x), p = w.p;
  // fundo com paralaxe
  const bg = IMG[w.def.bg];
  if (bg) { const off = -((w.cam.x * 0.35) % 64); for (let x = off - 64; x < W; x += 64) for (let y = 0; y < H; y += 64) ctx.drawImage(bg, Math.round(x), y); }
  else rect(0, 0, W, H, '#9ad');
  rect(0, 0, W, H, 'rgba(0,0,0,.06)');
  ctx.save();
  const sh = w.shake > 0 ? (Math.random() - .5) * w.shake * 0.6 : 0;
  ctx.translate(-cx + sh, 0);
  ctx.drawImage(w.tileCanvas, 0, 0);
  ctx.font = FONT(8);
  const t = w.time;
  const near = (x, r = 120) => Math.abs((p.x + PW / 2) - x) < r;

  // caixas de necessidades
  for (const c of w.crates) if (!c.paid) {
    spr('box' + c.box, 32, 32, 0, c.x, c.y);
    const tw = ctx.measureText(c.name).width;
    rect(c.x + 16 - tw / 2 - 4, c.y - 26, tw + 8, 12, 'rgba(0,0,0,.65)');
    label(c.name, c.x + 16, c.y - 24, '#fff4d6'); label(fmt(c.price), c.x + 16, c.y - 12, '#ffd23f');
    if (near(c.x + 16, 90)) label('NECESSIDADE', c.x + 16, c.y - 40, '#7dffb0');
  }
  for (const e of w.ents) {
    switch (e.t) {
      case 'sign': {
        ctx.font = FONT(8); const tw = ctx.measureText(e.text).width;
        rect(e.x - 2, e.y - 14, 4, 14, '#6b3f1d');
        frame(e.x - tw / 2 - 6, e.y - 30, tw + 12, 18, '#c98a4a', '#5a3216');
        txt(e.text, e.x, e.y - 26, '#3a1f08', 'center', null); break;
      }
      case 'coin': if (e.alive) spr('gem2', 16, 16, t / 6 + e.ph, e.x - 8, e.y - 8 + Math.sin(t / 14 + e.ph) * 2); break;
      case 'star': if (e.alive) {
        const by = Math.sin(t / 12) * 3; spr('gem1', 16, 16, t / 6, e.x - 16, e.y - 16 + by, false, 2);
        if (near(e.x, 110)) { label('LAZER', e.x, e.y - 34, '#ffd23f'); label(fmt(STAR_COST), e.x, e.y - 24, '#fff'); }
      } break;
      case 'want': if (e.alive) {
        const by = Math.sin(t / 14) * 3;
        const r = 18 + Math.sin(t / 8) * 2; ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, e.y + by, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
        spr('gem' + e.gem, 16, 16, t / 7, e.x - 16, e.y - 16 + by, false, 2);
        if (t % 50 < 6) { rect(e.x + 12, e.y - 18 + by, 3, 3, '#fff'); rect(e.x - 16, e.y - 6 + by, 2, 2, '#fff'); }
        if (near(e.x, 130)) { label(e.name.toUpperCase(), e.x, e.y - 42, '#ff8de0'); label(fmt(e.price), e.x, e.y - 32, '#fff'); }
      } break;
      case 'bank': {
        spr(e.active ? 'flag' : 'pole', 48, 48, t / 8, e.x - 24, e.y - 48);
        label('COFRINHO', e.x, e.y - 62, e.active ? '#7dffb0' : '#fff4d6');
        if (e.near && e.active) { label('[E] guardar', e.x, e.y - 74, '#ffd23f'); }
        break;
      }
      case 'mentor': {
        spr('mentor_idle', 72, 48, t / 6, e.x - 48, e.y - 48, e.face < 0, 1);
        label('DONA POUPANÇA', e.x, e.y - 60, '#ffd23f');
        if (e.near) label('[E] dicas', e.x, e.y - 72, '#fff'); break;
      }
      case 'walker': drawWalker(w, e, near); break;
      case 'cannon': {
        if (!e.alive && e.dead <= 0) break;
        const fl = e.dir > 0; const dy = e.alive ? 0 : 6;
        ctx.globalAlpha = e.alive ? 1 : Math.max(0, e.dead / 30);
        spr(e.fire > 0 ? 'e4_walk' : 'e4_idle', 48, 48, t / 6, e.x + 10 - 24, e.y + e.h - 48 + dy, fl); ctx.globalAlpha = 1;
        if (e.alive && near(e.x, 130)) label('CARTÃO', e.x + 10, e.y - 16, '#ff9f6b'); break;
      }
      case 'ball': spr('ball', 10, 10, 0, e.x - 5, e.y - 5); break;
      case 'flyer': spr('e5_fly', 48, 48, t / 5, e.x + 10 - 24, e.y + 10 - 24 - 2, e.dir < 0); if (near(e.x, 120)) label('COBRANÇA', e.x + 10, e.y - 26, '#ff9f6b'); break;
      case 'saw': spr('saw', 48, 48, t / 3, e.x - 24, e.y - 24); if (near(e.x, 120)) label('CHEQUE ESPECIAL', e.x, e.y - 34, '#ff9f6b'); break;
      case 'spikes': spr('spikes', 48, 48, e.anim, e.x - 24, e.y - 48); break;
      case 'electric': {
        spr('electric', 48, 48, e.on ? 2 + (t / 3) : (t / 20) % 2, e.x - 24, e.y - 48);
        if (near(e.x, 120)) label(e.on ? 'MULTA!' : 'MULTA', e.x, e.y - 60, e.on ? '#ff6b6b' : '#ff9f6b'); break;
      }
      case 'chest': {
        spr(e.kind === 'safe' ? 'box3' : 'box1', 32, 32, 0, e.x - 16, e.y - 32 - (e.opened ? 0 : Math.abs(Math.sin(t / 20)) * 2));
        label(e.kind === 'safe' ? 'TESOURO SEGURO' : 'INVESTIMENTO', e.x, e.y - 52, e.kind === 'safe' ? '#7dffb0' : '#ff9f6b');
        label(e.kind === 'safe' ? '+R$30 garantido' : 'pode ganhar ou perder', e.x, e.y - 42, '#fff'); break;
      }
      case 'finish': spr(w.done ? 'end_pressed' : 'end_idle', 64, 64, t / 8, e.x - 32, e.y - 64); label('SEU SONHO', e.x, e.y - 76, '#ffd23f'); break;
    }
  }
  // jogador
  drawPlayer(w);
  // partículas e textos
  for (const q of w.parts) { ctx.globalAlpha = clamp(q.life / 20, 0, 1); rect(q.x, q.y, q.s, q.s, q.c); } ctx.globalAlpha = 1;
  ctx.font = FONT(8);
  for (const f of w.floats) { ctx.globalAlpha = clamp(f.life / 25, 0, 1); txt(f.text, f.x, f.y, f.color, 'center'); } ctx.globalAlpha = 1;
  ctx.restore();
}

function drawWalker(w, e, near) {
  if (!e.alive && e.dead <= 0) return;
  const s = e.s || 1;
  let key, fr = w.time / 5 + e.anim / 5;
  if (e.type === 'boss') key = 'e1_run'; else if (e.type === 'juros') key = 'e2_run'; else key = 'e3_walk';
  const squash = e.alive ? 1 : Math.max(0.15, e.dead / 30);
  ctx.globalAlpha = e.alive ? 1 : e.dead / 30;
  const dw = 48 * s, dh = 48 * s * squash;
  const x = e.x + e.w / 2 - dw / 2, y = e.y + e.h - dh;
  const img = IMG[key];
  if (img) {
    const n = Math.floor(img.width / 48), f = Math.floor(fr) % n;
    if (e.dir < 0 && e.type === 'boss') { ctx.save(); ctx.translate(Math.round(x + dw), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(img, f * 48, 0, 48, 48, 0, 0, dw, dh); ctx.restore(); }
    else ctx.drawImage(img, f * 48, 0, 48, 48, Math.round(x), Math.round(y), dw, dh);
  }
  ctx.globalAlpha = 1;
  if (e.alive && near(e.x, 130 + 40 * s)) label(LABELS[e.type] || '', e.x + e.w / 2, e.y - 14 - 2 * s, e.type === 'boss' ? '#ff6b6b' : '#ff9f6b');
}

function drawPlayer(w) {
  const p = w.p, cx = p.x + PW / 2, feet = p.y + PH;
  if (p.spawn > 0) {
    const f = Math.floor((42 - p.spawn) / 6);
    spr('hero_appear', 96, 96, Math.min(6, f), cx - 48, feet - 64 - 16); return;
  }
  if (p.inv > 0 && Math.floor(p.inv / 4) % 2 === 0 && p.hurtT <= 0) return;
  let key = 'hero_idle', n = 11, sp = 6;
  if (w.done) { key = 'hero_jump'; }
  else if (p.hurtT > 0) { key = 'hero_hit'; n = 7; sp = 3; }
  else if (!p.ground) { key = p.vy < 0 ? (p.jumps === 2 ? 'hero_dj' : 'hero_jump') : 'hero_fall'; sp = 4; }
  else if (Math.abs(p.vx) > 0.3) { key = 'hero_run'; n = 12; sp = 3.5; }
  if (p.turbo > 0) { ctx.globalAlpha = 0.35; spr(key, 32, 32, p.t / sp, cx - 16 - p.face * 6, feet - 32, p.face < 0); ctx.globalAlpha = 1; }
  spr(key, 32, 32, p.t / sp, cx - 16, feet - 32, p.face < 0);
}

/* -------------------------------------------------------------- HUD */
function drawHUD(w) {
  ctx.font = FONT(8);
  rect(4, 4, 172, RUN.debt > 0 || w.dispD > 1 ? 62 : 50, 'rgba(8,20,30,.72)');
  spr('gem2', 16, 16, w.time / 8, 7, 6);
  txt(fmt(w.dispW), 28, 10, '#ffd23f');
  bar(84, 8, 86, 8, RUN.wallet / 400, '#ffd23f');
  spr('gem3', 16, 16, 0, 7, 20);
  txt('Poupança ' + fmt(w.dispS), 28, 24, '#7dffb0');
  spr('gem1', 16, 16, 0, 7, 34);
  const hc = RUN.happy > 60 ? '#5be37d' : RUN.happy > 30 ? '#ffd23f' : '#ff6b6b';
  txt('Feliz', 28, 38, '#fff4d6'); bar(84, 38, 86, 8, w.dispH / 100, hc);
  if (RUN.debt > 0 || w.dispD > 1) { spr('gem4', 16, 16, 0, 7, 48); txt('Dívida ' + fmt(w.dispD), 28, 52, '#ff6b6b'); }
  // direita: fase e status
  rect(W - 176, 4, 172, 26, 'rgba(8,20,30,.72)');
  txt('FASE ' + (w.idx + 1), W - 8, 8, '#ffd23f', 'right'); txt(w.def.name, W - 8, 19, '#fff4d6', 'right');
  let ix = W - 24;
  if (w.p.turbo > 0) { spr('gem1', 16, 16, w.time / 5, ix, 34); rect(ix - 34, 40, 30, 4, '#12303b'); rect(ix - 34, 40, 30 * w.p.turbo / 420, 4, '#ffd23f'); ix -= 52; }
  if (RUN.shield > 0) { rect(ix, 36, 16, 14, '#1f8a86'); txt(String(RUN.shield), ix + 8, 39, '#fff', 'center'); txt('RESERVA', ix - 4, 52, '#7dffb0', 'right'); }
  if (RUN.coinMult > 1) txt('CURSO +30%', W - 8, 54, '#7dffb0', 'right');
  // banner central
  if (w.banner) {
    const b = w.banner, a = b.t < 12 ? b.t / 12 : b.t > 140 ? (170 - b.t) / 30 : 1;
    ctx.globalAlpha = clamp(a, 0, 1);
    const wd = Math.max(ctx.measureText(b.text).width, ctx.measureText(b.sub || '').width) + 28;
    rect(W / 2 - wd / 2, 74, wd, b.sub ? 34 : 22, 'rgba(8,20,30,.82)');
    txt(b.text, W / 2, 80, b.color, 'center'); if (b.sub) txt(b.sub, W / 2, 93, '#fff4d6', 'center');
    ctx.globalAlpha = 1;
  }
  if (w.time < 300 && !UI.modal) txt('Setas/A-D: andar   ESPAÇO: pular (2x)   E: interagir', W / 2, H - 12, 'rgba(255,255,255,.9)', 'center');
}
