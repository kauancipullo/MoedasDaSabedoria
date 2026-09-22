'use strict';
/* Laço principal do jogo */

function update() {
  G.t++;
  if (anyP('KeyM')) { Sfx.setMuted(!Sfx.muted); if (!Sfx.muted && G.scene === 'play' && G.w) Sfx.startMusic(G.w.idx); syncButtons(); }
  if (anyP('KeyF')) toggleFullscreen();
  if (G.scene !== 'title' && G.scene !== 'load' && performance.now() - G_lastInput > 150000) { toTitle(); G_lastInput = performance.now(); }

  switch (G.scene) {
    case 'title': updateTitle(); break;
    case 'how': updateHow(); break;
    case 'about': updateAbout(); break;
    case 'summary': updateSummary(); break;
    case 'ending': updateEnding(); break;
    case 'quiz': case 'story':
      if (!updateModal() && !UI.modal) { /* aguardando */ }
      break;
    case 'play': updatePlay(); break;
  }
  endInput();
}

function updatePlay() {
  const w = G.w; if (!w) return;
  if (UI.modal) { updateModal(); if (G.w) { w.dispW += (RUN.wallet - w.dispW) * 0.2; w.dispS += (RUN.savings - w.dispS) * 0.2; w.dispD += (RUN.debt - w.dispD) * 0.2; w.dispH += (RUN.happy - w.dispH) * 0.2; } return; }
  if (anyP('KeyP', 'Escape')) { G.paused = !G.paused; Sfx.play(G.paused ? 'pause' : 'unpause'); }
  if (G.paused) return;
  updateWorld(w);
  if (w.failed) {
    w.failed = false; Sfx.play('lose'); Sfx.stopMusic();
    openDialog([['mentor', 'Sua felicidade chegou a zero! Só economizar demais também não dá: dinheiro serve para viver bem.'], ['mentor', 'Vamos tentar de novo, equilibrando lazer e economia.']], retryPhase);
  }
  if (w.done && w.doneT > 120) finishPhase();
}

let btnHidden = null, ebookShown = null;
function draw() {
  const hide = !!UI.modal || ['summary', 'ending', 'quiz', 'story', 'how', 'about'].includes(G.scene);
  if (hide !== btnHidden) { btnHidden = hide; document.body.classList.toggle('hidebtn', hide); }
  const showEbook = G.scene === 'ending' && G.ending && G.ending.page >= 3;
  if (showEbook !== ebookShown) { ebookShown = showEbook; const b = document.getElementById('btnEbook'); if (b) b.classList.toggle('show', showEbook); }
  ctx.clearRect(0, 0, W, H);
  ctx.font = FONT(8); ctx.textBaseline = 'top';
  switch (G.scene) {
    case 'load': rect(0, 0, W, H, '#12303b'); txt('Carregando...', W / 2, H / 2 - 4, '#fff', 'center'); break;
    case 'title': drawTitle(); break;
    case 'how': drawHow(); break;
    case 'about': drawAbout(); break;
    case 'summary': drawSummary(); break;
    case 'ending': drawEnding(); break;
    case 'quiz': case 'story': drawStory(); break;
    case 'play':
      if (G.w) {
        drawWorld(G.w); drawHUD(G.w);
        if (G.paused) { rect(0, 0, W, H, 'rgba(6,14,22,.6)'); ctx.font = FONT(16); txt('PAUSA', W / 2, H / 2 - 16, '#ffd23f', 'center'); ctx.font = FONT(8); txt('Aperte P para continuar', W / 2, H / 2 + 10, '#fff', 'center'); }
      }
      break;
  }
  drawModal();
}

function drawStory() {
  const i = Math.min(4, RUN ? RUN.phase : 0);
  backdrop(LEVEL_DEFS[i].bg, 0.3, 0.15);
  rect(0, 214, W, 58, '#12303b');
  if (IMG.tileset) { const [ox, oy] = THEME_ORIGIN[LEVEL_DEFS[i].theme]; for (let x = 0; x < W; x += 16) { ctx.drawImage(IMG.tileset, ox + 16, oy, 16, 16, x, 214, 16, 16); for (let y = 230; y < H; y += 16) ctx.drawImage(IMG.tileset, ox + 16, oy + 16, 16, 16, x, y, 16, 16); } }
  const who = UI.modal && UI.modal.who;
  if (who === 'divida') { const s = clamp(1 + RUN.debt / 140, 1, 2.6) * 2; spr('e1_idle', 48, 48, G.t / 6, W - 60 - 24 * s, 214 - 48 * s + 4 * s, true, s); }
  else spr('hero_idle', 32, 32, G.t / 5, 20, 182);
  spr('mentor_idle', 72, 48, G.t / 6, W - 96, 214 - 48 + 2, true);
}

/* ------------------------------------------------------------ botões da página */
function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen || (() => { })).call(el);
  else (document.exitFullscreen || document.webkitExitFullscreen || (() => { })).call(document);
}
function syncButtons() { const b = document.getElementById('btnMute'); if (b) b.textContent = Sfx.muted ? 'SOM: OFF' : 'SOM: ON'; }
document.getElementById('btnMute').addEventListener('click', () => { Sfx.resume(); Sfx.setMuted(!Sfx.muted); if (!Sfx.muted && G.scene === 'play' && G.w) Sfx.startMusic(G.w.idx); syncButtons(); });
document.getElementById('btnFull').addEventListener('click', toggleFullscreen);
document.getElementById('btnEbook').addEventListener('click', () => { try { Sfx.play('ok'); } catch (e) { } });

/* ------------------------------------------------------------ inicialização */
let last = performance.now(), acc = 0;
function loop(now) {
  const dt = Math.min(100, now - last); last = now; acc += dt;
  let n = 0;
  while (acc >= 1000 / 60 && n < 5) { update(); acc -= 1000 / 60; n++; }
  if (n === 5) acc = 0;
  draw();
  requestAnimationFrame(loop);
}
window.__G = G; window.startGame = startGame; // depuração / testes

loadAssets().then(() => {
  const fase = parseInt(QS.get('fase') || '0', 10);
  if (fase >= 1 && fase <= 5) {
    const cheats = {};
    if (QS.get('dinheiro')) cheats.wallet = +QS.get('dinheiro');
    if (QS.get('poupanca')) cheats.savings = +QS.get('poupanca');
    if (QS.get('divida')) { cheats.debt = +QS.get('divida'); cheats.parcelas = Math.ceil(cheats.debt / 100); cheats.tookCredit = cheats.parcelas; }
    startGame(fase - 1, cheats);
  } else G.scene = 'title';
  requestAnimationFrame(loop);
});
